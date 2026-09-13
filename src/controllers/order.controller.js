'use strict';

const { checkout, listOrders, getOrder } = require('../services/order.service');
const { success, error } = require('../utils/response');
const { LINKS } = require('../utils/navigation');

function orderNavigation() {
  return { links: [LINKS.menu, LINKS.cart, LINKS.orders, LINKS.home], next: LINKS.orders };
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

// POST /api/orders/checkout — Delivery Address + Order creation.
// The address body is fully Zod-validated; no order is confirmed without it.
async function create(req, res, next) {
  try {
    const order = await checkout(req.user.id, req.body);
    return success(res, {
      message: 'Order confirmed',
      data: { order },
      navigation: orderNavigation(),
      statusCode: 201,
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// GET /api/orders — own orders, paginated (read-only for BASIC).
async function list(req, res, next) {
  try {
    // Pagination is pre-validated by validate.query(paginationSchema).
    const { items, meta } = await listOrders(req.user.id, req.validatedQuery);
    return success(res, {
      message: 'Orders',
      data: { items },
      navigation: { links: [LINKS.menu, LINKS.cart, LINKS.orders, LINKS.home] },
      meta,
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// GET /api/orders/:id — one own order with status (read-only for BASIC).
async function details(req, res, next) {
  try {
    const order = await getOrder(req.user.id, req.validatedParams.id);
    return success(res, {
      message: 'Order details',
      data: { order },
      navigation: { links: [LINKS.menu, LINKS.cart, LINKS.orders, LINKS.home] },
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

module.exports = { create, list, details };
