'use strict';

const express = require('express');
const deliveryController = require('../controllers/delivery.controller');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { orderIdParamSchema } = require('../validations/order.validation');
const { paginationSchema } = require('../validations/product.validation');

const router = express.Router();

// DELIVERY-only area: same login as every role, authorization by role.
// No ADMIN management here (Task 7 owns that).
router.use(requireAuth, requireRole('DELIVERY'));

// Authenticated write throttle (per courier, generous).
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const deliveryWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => `delivery-write:${req.user ? req.user.id : req.ip || 'unknown'}`,
  message: 'Too many delivery attempts. Try again shortly.',
  code: 'RATE_LIMITED',
});

// Delivery Orders — Current Orders (READY_FOR_DELIVERY + own OUT_FOR_DELIVERY).
router.get('/orders/current', deliveryController.current);

// Accept operation — concurrency-protected, one active order per courier.
router.post(
  '/orders/:id/accept',
  deliveryWriteLimiter,
  validate.params(orderIdParamSchema),
  deliveryController.accept
);

// Delivered operation — only after acceptance, only by the accepting courier.
router.post(
  '/orders/:id/deliver',
  deliveryWriteLimiter,
  validate.params(orderIdParamSchema),
  deliveryController.deliver
);

// Previous Orders — own delivered orders, read-only (no write routes).
router.get('/orders/previous', validate.query(paginationSchema), deliveryController.previous);

module.exports = router;
