'use strict';

const express = require('express');
const chefController = require('../controllers/chef.controller');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { orderIdParamSchema } = require('../validations/order.validation');
const { paginationSchema } = require('../validations/product.validation');

const router = express.Router();

// CHEF-only area: same login as every role, authorization by role.
// No DELIVERY / ADMIN management here (their tasks own those).
router.use(requireAuth, requireRole('CHEF'));

// Authenticated write throttle (per chef, generous).
const { rateLimit } = require('../middlewares/rateLimit.middleware');
const chefWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => `chef-write:${req.user ? req.user.id : req.ip || 'unknown'}`,
  message: 'Too many chef attempts. Try again shortly.',
  code: 'RATE_LIMITED',
});

// Request Orders — PENDING orders with preparation data.
router.get('/requests', chefController.requests);

// Prepared operation — the only status change a CHEF can perform.
router.post(
  '/requests/:id/prepare',
  chefWriteLimiter,
  validate.params(orderIdParamSchema),
  chefController.prepare
);

// Previous Orders — own prepared orders, read-only (no write routes).
router.get('/history', validate.query(paginationSchema), chefController.history);

module.exports = router;
