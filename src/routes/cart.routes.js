'use strict';

const express = require('express');
const cartController = require('../controllers/cart.controller');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  addToCartSchema,
  updateCartItemSchema,
  cartItemParamSchema,
} = require('../validations/cart.validation');

const router = express.Router();

// Everything here is the current authenticated BASIC user's cart.
// BASIC features only (server-side role enforcement).
router.use(requireAuth, requireRole('BASIC'));

// View own cart.
router.get('/', cartController.show);

// Confirm Order — totals preview, moves to the Delivery Address route.
router.post('/confirm', cartController.confirm);

// Add to cart by Product ID (same product again increases quantity).
router.post('/items', validate(addToCartSchema), cartController.add);

// Increase / decrease / set quantity.
router.patch(
  '/items/:productId',
  validate.params(cartItemParamSchema),
  validate(updateCartItemSchema),
  cartController.update
);

// Delete a product from the cart.
router.delete(
  '/items/:productId',
  validate.params(cartItemParamSchema),
  cartController.remove
);

module.exports = router;
