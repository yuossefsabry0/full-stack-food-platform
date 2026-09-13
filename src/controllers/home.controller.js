'use strict';

const { success } = require('../utils/response');
const { toPublicUser } = require('../services/auth.service');
const { homeNavigation } = require('../utils/navigation');

// BASIC foundation: a protected Home entrypoint. Future BASIC features
// (products browsing, cart, orders, ...) attach here in later Tasks.
function home(req, res) {
  return success(res, {
    message: `Welcome home, ${req.user.name}`,
    data: { user: toPublicUser(req.user) },
    navigation: homeNavigation(),
  });
}

module.exports = { home };
