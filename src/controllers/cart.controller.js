'use strict';

const { getCart, addToCart, updateCartItem, removeFromCart } = require('../services/cart.service');
const { previewConfirm } = require('../services/order.service');
const { success, error } = require('../utils/response');
const { LINKS } = require('../utils/navigation');

function cartNavigation() {
  return { links: [LINKS.menu, LINKS.cart], next: LINKS.menu };
}

function serviceError(res, err) {
  if (err.statusCode) {
    return error(res, {
      message: err.message,
      code: err.code || 'ERROR',
      errors: err.errors || null,
      statusCode: err.statusCode,
    });
  }
  return null;
}

// All handlers operate on the current authenticated user's cart only
// (req.user.id) — cart ids are never accepted from the client.

// GET /api/cart
async function show(req, res, next) {
  try {
    const cart = await getCart(req.user.id);
    return success(res, {
      message: 'Cart',
      data: { cart },
      navigation: cartNavigation(),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// POST /api/cart/items — add by Product ID (repeat adds increase quantity).
async function add(req, res, next) {
  try {
    const cart = await addToCart(req.user.id, req.body.productId, req.body.quantity);
    return success(res, {
      message: 'Product added to cart',
      data: { cart },
      navigation: cartNavigation(),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// PATCH /api/cart/items/:productId — set quantity or increase/decrease.
async function update(req, res, next) {
  try {
    const cart = await updateCartItem(req.user.id, req.validatedParams.productId, req.body);
    return success(res, {
      message: 'Cart updated',
      data: { cart },
      navigation: cartNavigation(),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// DELETE /api/cart/items/:productId — delete a product from the cart.
async function remove(req, res, next) {
  try {
    const cart = await removeFromCart(req.user.id, req.validatedParams.productId);
    return success(res, {
      message: 'Product removed from cart',
      data: { cart },
      navigation: cartNavigation(),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// POST /api/cart/confirm — Confirm Order operation: shows the order totals
// and moves the user to the Delivery Address route. Fails on an empty cart.
async function confirm(req, res, next) {
  try {
    const preview = await previewConfirm(req.user.id);
    return success(res, {
      message: 'Confirm your order with a delivery address',
      data: { preview },
      navigation: {
        links: [LINKS.menu, LINKS.cart, LINKS.confirmOrder, LINKS.deliveryAddress],
        next: LINKS.deliveryAddress,
      },
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

module.exports = { show, add, update, remove, confirm };
