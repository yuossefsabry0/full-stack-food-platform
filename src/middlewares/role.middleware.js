'use strict';

const { error } = require('../utils/response');

// Role-based authorization. Must run after requireAuth (needs req.user).
// Usage: router.use(requireAuth, requireRole('CHEF'))
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, {
        message: 'Access token required',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return error(res, {
        message: 'Forbidden: insufficient role',
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    }
    return next();
  };
}

module.exports = { requireRole };
