'use strict';

const {
  listCurrentOrders,
  acceptOrder,
  deliverOrder,
  listPreviousOrders,
} = require('../services/delivery.service');
const { success, error } = require('../utils/response');
const { LINKS } = require('../utils/navigation');

function deliveryNavigation(next) {
  const navigation = { links: [LINKS.deliveryCurrent, LINKS.deliveryPrevious, LINKS.home] };
  if (next) navigation.next = next;
  return navigation;
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

// GET /api/delivery/orders/current — READY_FOR_DELIVERY + own OUT_FOR_DELIVERY.
async function current(req, res, next) {
  try {
    const items = await listCurrentOrders(req.user.id);
    return success(res, {
      message: 'Current delivery orders',
      data: { items },
      navigation: deliveryNavigation(),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// POST /api/delivery/orders/:id/accept — concurrency-protected claim.
async function accept(req, res, next) {
  try {
    const order = await acceptOrder(req.user.id, req.validatedParams.id);
    return success(res, {
      message: 'Order accepted for delivery',
      data: { order },
      navigation: deliveryNavigation({
        method: 'POST',
        href: `/api/delivery/orders/${order.id}/deliver`,
        label: 'Delivered',
      }),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// POST /api/delivery/orders/:id/deliver — completion by the accepting courier.
async function deliver(req, res, next) {
  try {
    const order = await deliverOrder(req.user.id, req.validatedParams.id);
    return success(res, {
      message: 'Order delivered',
      data: { order },
      navigation: deliveryNavigation(LINKS.deliveryPrevious),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// GET /api/delivery/orders/previous — own delivered orders, read-only.
async function previous(req, res, next) {
  try {
    // Pagination is pre-validated by validate.query(paginationSchema).
    const { items, meta } = await listPreviousOrders(req.user.id, req.validatedQuery);
    return success(res, {
      message: 'Previous delivery orders',
      data: { items },
      navigation: deliveryNavigation(),
      meta,
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

module.exports = { current, accept, deliver, previous };
