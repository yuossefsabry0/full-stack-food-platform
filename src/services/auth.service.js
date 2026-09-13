'use strict';

const prisma = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { allocatePublicId } = require('./publicId.service');
const {
  signAccessToken,
  signRefreshToken,
  sha256Hex,
  accessTokenExpiryDate,
  refreshTokenExpiryDate,
} = require('./token.service');

function toPublicUser(user) {
  return {
    userCode: user.publicId,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

async function registerBasicUser({ name, username, email, password }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true, email: true },
  });
  if (existing) {
    const err = new Error('Account already exists');
    err.statusCode = 409;
    err.code = 'ACCOUNT_EXISTS';
    err.errors =
      existing.username === username
        ? [{ field: 'username', message: 'Username is already taken' }]
        : [{ field: 'email', message: 'Email is already registered' }];
    throw err;
  }

  const passwordHash = await hashPassword(password);

  // Allocate publicId + create user atomically. Role is ALWAYS BASIC here —
  // public registration can never choose CHEF / DELIVERY / ADMIN.
  const user = await prisma.$transaction(async (tx) => {
    const publicId = await allocatePublicId(tx);
    return tx.user.create({
      data: { publicId, name, username, email, passwordHash, role: 'BASIC' },
    });
  });

  return toPublicUser(user);
}

async function loginBasicUser({ username, password }) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    const err = new Error('Invalid username or password');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Invalid username or password');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const accessToken = signAccessToken({
    internalId: user.id,
    publicId: user.publicId,
    role: user.role,
  });

  // issue a Refresh Token alongside the Access Token. Separate
  // secret, separate (longer) expiry, stored hashed for secure validation.
  const refreshToken = signRefreshToken({
    internalId: user.id,
    publicId: user.publicId,
    role: user.role,
  });

  // Record the access token (hashed) for future auditing/revocation.
  try {
    await prisma.authToken.create({
      data: {
        userId: user.id,
        type: 'ACCESS',
        tokenHash: sha256Hex(accessToken),
        expiresAt: accessTokenExpiryDate(),
      },
    });
  } catch (e) {
    // Token issuance already succeeded; a bookkeeping failure must not fail login.
    // eslint-disable-next-line no-console
    console.error('Failed to persist access token record:', e.message);
  }

  try {
    await prisma.authToken.create({
      data: {
        userId: user.id,
        type: 'REFRESH',
        tokenHash: sha256Hex(refreshToken),
        expiresAt: refreshTokenExpiryDate(),
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to persist refresh token record:', e.message);
  }

  return { user: toPublicUser(user), accessToken, refreshToken, tokenType: 'Bearer' };
}

// exchange a valid, non-revoked Refresh Token for a new token pair.
// The presented refresh token is ROTATED: it is revoked and replaced, so a
// stolen refresh token cannot be reused after the legitimate client refreshes.
async function refreshAccessToken(presentedRefreshToken) {
  const { verifyRefreshToken } = require('./token.service');
  let payload;
  try {
    payload = verifyRefreshToken(presentedRefreshToken);
  } catch (e) {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    err.code = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  const record = await prisma.authToken.findUnique({
    where: { tokenHash: sha256Hex(presentedRefreshToken) },
  });
  if (
    !record ||
    record.type !== 'REFRESH' ||
    record.revokedAt ||
    record.expiresAt.getTime() <= Date.now()
  ) {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    err.code = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || !user.isActive || user.id !== payload.sub) {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    err.code = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  const accessToken = signAccessToken({
    internalId: user.id,
    publicId: user.publicId,
    role: user.role,
  });
  const refreshToken = signRefreshToken({
    internalId: user.id,
    publicId: user.publicId,
    role: user.role,
  });

  await prisma.$transaction([
    prisma.authToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    }),
    prisma.authToken.create({
      data: {
        userId: user.id,
        type: 'ACCESS',
        tokenHash: sha256Hex(accessToken),
        expiresAt: accessTokenExpiryDate(),
      },
    }),
    prisma.authToken.create({
      data: {
        userId: user.id,
        type: 'REFRESH',
        tokenHash: sha256Hex(refreshToken),
        expiresAt: refreshTokenExpiryDate(),
      },
    }),
  ]);

  return { user: toPublicUser(user), accessToken, refreshToken, tokenType: 'Bearer' };
}

// revoke every active Refresh Token for a user (used after a
// password change so old sessions cannot mint new Access Tokens).
async function revokeRefreshTokensForUser(userId) {
  await prisma.authToken.updateMany({
    where: { userId, type: 'REFRESH', revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = {
  registerBasicUser,
  loginBasicUser,
  refreshAccessToken,
  revokeRefreshTokensForUser,
  toPublicUser,
};
