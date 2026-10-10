'use strict';

const prisma = require('../config/database');
const { error } = require('../utils/response');
const { verifyAccessToken, sha256Hex } = require('../services/token.service');

// Optional authentication for public browse-only GET handlers (Home only).
// Applied ONLY at the route level for GET /api/home — never globally.
// - No Authorization header (guest): req.user = null, continue as guest.
// - Valid token + active account: attaches req.auth/req.user (identical to requireAuth).
// - Present but invalid/expired token or unavailable account: 401 (same as requireAuth).
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    req.auth = null;
    req.user = null;
    return next();
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (e) {
    return error(res, {
      message: 'Invalid or expired access token',
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }

  try {
    // Same server-side revocation check as requireAuth: a logged-out or
    // rotated access token must not count as authenticated here either.
    const tokenRecord = await prisma.authToken.findUnique({
      where: { tokenHash: sha256Hex(token) },
    });
    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.userId !== payload.sub) {
      return error(res, {
        message: 'Invalid or expired access token',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      return error(res, {
        message: 'Account not available',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    }
    req.auth = payload;
    req.user = user;
    return next();
  } catch (e) {
    return next(e);
  }
}

module.exports = { optionalAuth };
