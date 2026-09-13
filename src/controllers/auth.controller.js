'use strict';

const { registerBasicUser, loginBasicUser, refreshAccessToken } = require('../services/auth.service');
const { success, error } = require('../utils/response');
const { authNavigation, LINKS } = require('../utils/navigation');
const env = require('../config/env');

async function register(req, res, next) {
  try {
    const user = await registerBasicUser(req.body);
    // Do NOT log the user in. Move them to the Login route instead.
    return success(res, {
      message: 'Account created. Please log in.',
      data: { user },
      navigation: {
        ...authNavigation('register'),
        next: LINKS.login,
      },
      statusCode: 201,
    });
  } catch (err) {
    if (err.statusCode) {
      return error(res, {
        message: err.message,
        code: err.code || 'ERROR',
        errors: err.errors || null,
        statusCode: err.statusCode,
      });
    }
    // Unique-constraint race (e.g. duplicate username/email or publicId).
    if (err && err.code === 'P2002') {
      return error(res, {
        message: 'Account already exists',
        code: 'ACCOUNT_EXISTS',
        errors: [{ field: 'body', message: 'Username or email is already taken' }],
        statusCode: 409,
      });
    }
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { user, accessToken, refreshToken, tokenType } = await loginBasicUser(req.body);
    // Result required for the future Home route: identity + token + where to go.
    // ADMIN logins move to the Admin Dashboard instead of Home.
    const next = user.role === 'ADMIN' ? LINKS.adminDashboard : LINKS.home;
    return success(res, {
      message: 'Login successful',
      data: { user, accessToken, refreshToken, tokenType, expiresIn: env.jwtAccessExpiresIn },
      navigation: {
        ...authNavigation('login'),
        next,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return error(res, {
        message: err.message,
        code: err.code || 'ERROR',
        errors: err.errors || null,
        statusCode: err.statusCode,
      });
    }
    return next(err);
  }
}

// exchange a valid, non-revoked Refresh Token for a new token pair.
async function refresh(req, res, next) {
  try {
    const { user, accessToken, refreshToken, tokenType } = await refreshAccessToken(
      req.body.refreshToken
    );
    return success(res, {
      message: 'Access token refreshed',
      data: { user, accessToken, refreshToken, tokenType, expiresIn: env.jwtAccessExpiresIn },
      navigation: { links: [LINKS.home], next: LINKS.home },
    });
  } catch (err) {
    if (err.statusCode) {
      return error(res, {
        message: err.message,
        code: err.code || 'ERROR',
        errors: err.errors || null,
        statusCode: err.statusCode,
      });
    }
    return next(err);
  }
}

module.exports = { register, login, refresh };
