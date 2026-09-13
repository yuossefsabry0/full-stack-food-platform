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

// Delivery Orders — Current Orders (READY_FOR_DELIVERY + own OUT_FOR_DELIVERY).
router.get('/orders/current', deliveryController.current);

// Accept operation — concurrency-protected, one active order per courier.
router.post(
  '/orders/:id/accept',
  validate.params(orderIdParamSchema),
  deliveryController.accept
);

// Delivered operation — only after acceptance, only by the accepting courier.
router.post(
  '/orders/:id/deliver',
  validate.params(orderIdParamSchema),
  deliveryController.deliver
);

// Previous Orders — own delivered orders, read-only (no write routes).
router.get('/orders/previous', validate.query(paginationSchema), deliveryController.previous);

module.exports = router;
