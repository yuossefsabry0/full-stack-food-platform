'use strict';

const { listRequestOrders, prepareOrder, handoverOrder, listPreviousOrders } = require('../services/chef.service');
const { success, error } = require('../utils/response');
const { LINKS } = require('../utils/navigation');

function chefNavigation(next) {
  const navigation = { links: [LINKS.chefRequests, LINKS.chefHistory, LINKS.home] };
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

// GET /api/chef/requests — active kitchen queue (PENDING + my PREPARING).
async function requests(req, res, next) {
  try {
    const items = await listRequestOrders();
    return success(res, {
      message: 'Request orders',
      data: { items },
      navigation: chefNavigation(),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// POST /api/chef/requests/:id/prepare — Accept operation (PENDING → PREPARING).
async function prepare(req, res, next) {
  try {
    const order = await prepareOrder(req.user.id, req.validatedParams.id);
    return success(res, {
      message: 'Order accepted and being prepared',
      data: { order },
      navigation: chefNavigation(LINKS.chefHistory),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// POST /api/chef/requests/:id/handover — Hand-over operation
// (PREPARING → READY_FOR_DELIVERY, accepting chef only). Makes the order
// visible to delivery; the user display does not advance on hand-over.
async function handover(req, res, next) {
  try {
    const order = await handoverOrder(req.user.id, req.validatedParams.id);
    return success(res, {
      message: 'Order handed over to delivery',
      data: { order },
      navigation: chefNavigation(LINKS.chefHistory),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// GET /api/chef/history — own handed-over orders (read-only).
async function history(req, res, next) {
  try {
    // Pagination is pre-validated by validate.query(paginationSchema).
    const { items, meta } = await listPreviousOrders(req.user.id, req.validatedQuery);
    return success(res, {
      message: 'Previous orders',
      data: { items },
      navigation: chefNavigation(),
      meta,
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

module.exports = { requests, prepare, handover, history };
