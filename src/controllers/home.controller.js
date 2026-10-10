'use strict';

const { success } = require('../utils/response');
const { toPublicUser } = require('../services/auth.service');
const { homeNavigation } = require('../utils/navigation');
const { MAX_QUANTITY } = require('../validations/cart.validation');

// Home entrypoint: public browse-only read with optional authentication.
// Authenticated requests keep the exact previous behavior; unauthenticated
// (guest) requests fall back safely without touching req.user.
function home(req, res) {
  if (!req.user) {
    return success(res, {
      message: 'Welcome home, guest',
      data: { user: null, maxQuantity: MAX_QUANTITY },
      navigation: homeNavigation(),
    });
  }
  return success(res, {
    message: `Welcome home, ${req.user.name}`,
    data: { user: toPublicUser(req.user), maxQuantity: MAX_QUANTITY },
    navigation: homeNavigation(),
  });
}

module.exports = { home };
