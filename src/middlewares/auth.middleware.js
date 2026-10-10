'use strict';

const prisma = require('../config/database');
const { error } = require('../utils/response');
const { verifyAccessToken, sha256Hex } = require('../services/token.service');

// Requires: Authorization: Bearer <accessToken>
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return error(res, {
      message: 'Access token required',
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
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

module.exports = { requireAuth };
