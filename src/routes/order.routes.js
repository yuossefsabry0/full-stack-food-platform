'use strict';

const express = require('express');
const orderController = require('../controllers/order.controller');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const { checkoutSchema, orderIdParamSchema } = require('../validations/order.validation');
const { paginationSchema } = require('../validations/product.validation');

const router = express.Router();

// BASIC features only: cart/checkout/orders require the BASIC role
// (server-side enforcement; CHEF / DELIVERY / ADMIN have their own areas).
router.use(requireAuth, requireRole('BASIC'));

// order creation is a sensitive endpoint: per-user rate limit.
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `checkout:${req.user ? req.user.id : req.ip || 'unknown'}`,
  message: 'Too many order attempts. Try again later.',
  code: 'RATE_LIMITED',
});

// Delivery Address route + Order creation (address fully Zod-validated).
router.post('/checkout', checkoutLimiter, validate(checkoutSchema), orderController.create);

// Own orders, paginated via ?page=&limit=.
router.get('/', validate.query(paginationSchema), orderController.list);

// One own order with its status.
router.get('/:id', validate.params(orderIdParamSchema), orderController.details);

module.exports = router;
