'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken({ internalId, publicId, role }) {
  const payload = {
    // jti guarantees every issued token is unique, even when two tokens for
    // the same user are minted within the same second (JWT `iat` has only
    // second resolution). Without it, rotation could reproduce an identical
    // token string and collide on the unique token-hash column.
    jti: crypto.randomBytes(16).toString('hex'),
    sub: internalId,
    userCode: publicId,
    role,
    type: 'ACCESS',
  };
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiresIn });
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.jwtAccessSecret);
  if (!payload || payload.type !== 'ACCESS') {
    throw new Error('Not an access token');
  }
  return payload;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function expiryDateFromToken(token, fallbackMs) {
  // Source of truth for the DB row: the signed token's own `exp` claim, so
  // the stored expiresAt can never diverge from what the verifier enforces
  // (jsonwebtoken accepts durations this parser does not, e.g. "3600").
  try {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded.exp === 'number') {
      return new Date(decoded.exp * 1000);
    }
  } catch {
    // fall through to the configured-duration parser below
  }
  return new Date(Date.now() + fallbackMs);
}

function accessTokenExpiryDate(token) {
  if (token) return expiryDateFromToken(token, 15 * 60 * 1000);
  return expiryDateFrom(env.jwtAccessExpiresIn, 15 * 60 * 1000);
}

//  Refresh Tokens (separate secret, separate longer expiry)

function signRefreshToken({ internalId, publicId, role }) {
  const payload = {
    // jti: see signAccessToken — rotation must always yield a distinct token.
    jti: crypto.randomBytes(16).toString('hex'),
    sub: internalId,
    userCode: publicId,
    role,
    type: 'REFRESH',
  };
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn });
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.jwtRefreshSecret);
  if (!payload || payload.type !== 'REFRESH') {
    throw new Error('Not a refresh token');
  }
  return payload;
}

function refreshTokenExpiryDate(token) {
  if (token) return expiryDateFromToken(token, 7 * 24 * 3600 * 1000);
  return expiryDateFrom(env.jwtRefreshExpiresIn, 7 * 24 * 3600 * 1000);
}

function expiryDateFrom(rawValue, fallbackMs) {
  // Parses "15m"/"1h"/"7d" style strings; falls back when unparseable.
  const raw = String(rawValue);
  const m = raw.match(/^(\d+)\s*([smhd])$/i);
  const now = Date.now();
  if (!m) return new Date(now + fallbackMs);
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const ms = unit === 's' ? n * 1000 : unit === 'm' ? n * 60 * 1000 : unit === 'h' ? n * 3600 * 1000 : n * 86400 * 1000;
  return new Date(now + ms);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  sha256Hex,
  accessTokenExpiryDate,
  refreshTokenExpiryDate,
  expiryDateFromToken,
};
