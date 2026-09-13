'use strict';

const { z } = require('zod');

// Cart validation: cart data, cart quantity, product linkage.

const MAX_QUANTITY = 99;

const addToCartSchema = z.object({
  productId: z.number().int('Product ID must be an integer').positive('Product ID must be positive'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(MAX_QUANTITY, `Quantity must be at most ${MAX_QUANTITY}`)
    .default(1),
}).strict();

// Quantity change: either set an exact quantity (increase/decrease in one
// step) or step the current quantity with increase/decrease.
const updateCartItemSchema = z.union([
  z.object({
    quantity: z
      .number()
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1')
      .max(MAX_QUANTITY, `Quantity must be at most ${MAX_QUANTITY}`),
  }).strict(),
  z.object({ action: z.enum(['increase', 'decrease']) }).strict(),
]);

const cartItemParamSchema = z.object({
  productId: z.coerce.number().int('Product ID must be an integer').positive('Product ID must be positive'),
});

module.exports = { MAX_QUANTITY, addToCartSchema, updateCartItemSchema, cartItemParamSchema };
