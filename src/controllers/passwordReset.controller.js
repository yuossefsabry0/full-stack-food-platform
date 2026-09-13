'use strict';

const {
  requestPasswordReset,
  verifyOtp,
  resetPasswordWithToken,
} = require('../services/passwordReset.service');
const { success, error } = require('../utils/response');
const { passwordFlowNavigation, LINKS } = require('../utils/navigation');
const env = require('../config/env');

function serviceError(res, err) {
  if (err.statusCode) {
    // Incorrect OTP: no `next` — the client stays on the OTP route.
    // Expired/locked OTP: point back to Forgot Password.
    const navigation =
      err.navigate === false
        ? { links: [LINKS.verifyOtp] }
        : err.navigate === 'forgot-password'
          ? passwordFlowNavigation('toForgot')
          : undefined;
    return error(res, {
      message: err.message,
      code: err.code || 'ERROR',
      errors: err.errors || null,
      statusCode: err.statusCode,
      ...(navigation ? { navigation } : {}),
    });
  }
  return null;
}

// Forgot Password. Always the same generic response, whether or
// not the email exists (enumeration protection).
async function forgotPassword(req, res, next) {
  try {
    const { message, devOtp } = await requestPasswordReset(req.body.email);
    return success(res, {
      message,
      data: devOtp ? { devOtp } : null,
      navigation: passwordFlowNavigation('toVerify'),
    });
  } catch (err) {
    return next(err);
  }
}

// OTP verification. Correct OTP -> move to the New Password route.
// Incorrect OTP -> 400 with no forward navigation.
async function verifyOtpCode(req, res, next) {
  try {
    const { resetToken } = await verifyOtp(req.body.email, req.body.otp);
    return success(res, {
      message: 'Code verified. Set your new password.',
      data: {
        email: String(req.body.email).trim().toLowerCase(),
        resetToken,
        resetTokenExpiresIn: `${env.resetTokenExpireMinutes}m`,
      },
      navigation: passwordFlowNavigation('toNewPassword'),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// New Password. On success the password is hashed + stored, the
// reset token is consumed, refresh sessions are revoked, and the user is
// moved to Login.
async function resetPassword(req, res, next) {
  try {
    const user = await resetPasswordWithToken(
      req.body.email,
      req.body.resetToken,
      req.body.password
    );
    return success(res, {
      message: 'Password changed. Please log in with your new password.',
      data: { user },
      navigation: passwordFlowNavigation('toLogin'),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

module.exports = { forgotPassword, verifyOtpCode, resetPassword };
