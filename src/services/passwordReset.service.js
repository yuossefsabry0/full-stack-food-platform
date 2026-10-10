'use strict';

const crypto = require('crypto');
const prisma = require('../config/database');
const env = require('../config/env');
const { hashPassword, comparePassword } = require('../utils/password');
const { sha256Hex } = require('./token.service');
const { sendOtpEmail } = require('./mailer.service');
const { revokeRefreshTokensForUser, toPublicUser } = require('./auth.service');

function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function fail(statusCode, code, message, extra) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (extra) Object.assign(err, extra);
  return err;
}

// Generic message used wherever revealing account state would enable
// enumeration (unknown email, no active OTP, wrong OTP).
const GENERIC_FORGOT_MESSAGE = 'If an account exists for this email, a one-time code has been sent.';

// Read at call time: OTP_DEV_EXPOSE must be the string "true" AND the
// environment dev-like (NODE_ENV exactly "development" or "test").
function isOtpDevExposeEnabled() {
  return (
    process.env.OTP_DEV_EXPOSE === 'true' &&
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
  );
}

async function requestPasswordReset(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Never reveal whether the email exists. Same response either way.
  if (!user || !user.isActive) {
    return { message: GENERIC_FORGOT_MESSAGE, devOtp: undefined };
  }

  // DB-backed cap: at most N OTPs per user per rolling hour (survives restarts,
  // complements the in-memory request rate limiter). Over the cap we silently
  // keep the generic response without creating or sending anything.
  const oneHourAgo = new Date(Date.now() - 3600 * 1000);
  const recentCount = await prisma.passwordResetOtp.count({
    where: { userId: user.id, createdAt: { gt: oneHourAgo } },
  });
  if (recentCount >= env.otpMaxRequestsPerHour) {
    // eslint-disable-next-line no-console
    console.error(`OTP request cap reached for user id ${user.id}; responding generically.`);
    return { message: GENERIC_FORGOT_MESSAGE, devOtp: undefined };
  }

  // Invalidate older active OTPs so only the newest code can be used.
  await prisma.passwordResetOtp.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const otp = generateOtp();
  const otpHash = await hashPassword(otp);
  await prisma.passwordResetOtp.create({
    data: {
      userId: user.id,
      otpHash,
      expiresAt: new Date(Date.now() + env.otpExpireMinutes * 60 * 1000),
    },
  });

  await sendOtpEmail({
    toEmail: user.email,
    otp,
    expiresInMinutes: env.otpExpireMinutes,
  });

  return {
    message: GENERIC_FORGOT_MESSAGE,
    // Development convenience only: lets the flow be exercised without an
    // email provider. Returned only when OTP_DEV_EXPOSE is the string
    // "true" AND the environment is dev-like.
    devOtp: isOtpDevExposeEnabled() ? otp : undefined,
  };
}

async function verifyOtp(email, otp) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  const latest = user
    ? await prisma.passwordResetOtp.findFirst({
        where: { userId: user.id, consumedAt: null },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  // Unknown email or no active OTP: generic incorrect response (no navigation).
  if (!user || !latest) {
    throw fail(400, 'OTP_INCORRECT', 'The code is incorrect.', { navigate: false });
  }

  if (latest.expiresAt.getTime() <= Date.now()) {
    await prisma.passwordResetOtp.update({
      where: { id: latest.id },
      data: { consumedAt: new Date() },
    });
    throw fail(400, 'OTP_EXPIRED', 'The code has expired. Request a new one.', {
      navigate: 'forgot-password',
    });
  }

  if (latest.attempts >= env.otpMaxAttempts) {
    await prisma.passwordResetOtp.update({
      where: { id: latest.id },
      data: { consumedAt: new Date() },
    });
    throw fail(429, 'OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts. Request a new code.', {
      navigate: 'forgot-password',
    });
  }

  const ok = await comparePassword(String(otp), latest.otpHash);
  if (!ok) {
    const attempts = latest.attempts + 1;
    const locked = attempts >= env.otpMaxAttempts;
    await prisma.passwordResetOtp.update({
      where: { id: latest.id },
      data: locked ? { attempts, consumedAt: new Date() } : { attempts },
    });
    if (locked) {
      throw fail(429, 'OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts. Request a new code.', {
        navigate: 'forgot-password',
      });
    }
    // Incorrect OTP: inform the user, stay on this route (no navigation).
    throw fail(400, 'OTP_INCORRECT', 'The code is incorrect.', { navigate: false });
  }

  // Correct OTP: one-time use — consume it immediately and issue the
  // single-use reset token that authorizes the New Password route.
  const resetToken = crypto.randomBytes(32).toString('hex');
  await prisma.passwordResetOtp.update({
    where: { id: latest.id },
    data: {
      consumedAt: new Date(),
      verifiedAt: new Date(),
      resetTokenHash: sha256Hex(resetToken),
      resetTokenExpiresAt: new Date(Date.now() + env.resetTokenExpireMinutes * 60 * 1000),
    },
  });

  return { resetToken };
}

async function resetPasswordWithToken(email, resetToken, newPassword) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  const record = user
    ? await prisma.passwordResetOtp.findFirst({
        where: {
          userId: user.id,
          resetTokenHash: sha256Hex(String(resetToken)),
          resetConsumedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  if (
    !user ||
    !record ||
    !record.resetTokenExpiresAt ||
    record.resetTokenExpiresAt.getTime() <= Date.now()
  ) {
    throw fail(400, 'INVALID_RESET_REQUEST', 'The password reset request is invalid or has expired.');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { resetConsumedAt: new Date() },
    }),
  ]);

  // Password changed: revoke all active Refresh Tokens so old sessions
  // cannot mint new Access Tokens. The user logs in again with the new password.
  await revokeRefreshTokensForUser(user.id);

  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  return toPublicUser(updated);
}

module.exports = {
  requestPasswordReset,
  verifyOtp,
  resetPasswordWithToken,
  GENERIC_FORGOT_MESSAGE,
};
