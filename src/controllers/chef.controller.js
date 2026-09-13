'use strict';

const { listRequestOrders, prepareOrder, listPreviousOrders } = require('../services/chef.service');
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

// GET /api/chef/requests — orders requiring preparation (PENDING).
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

// POST /api/chef/requests/:id/prepare — Prepared operation.
async function prepare(req, res, next) {
  try {
    const order = await prepareOrder(req.user.id, req.validatedParams.id);
    return success(res, {
      message: 'Order prepared and ready for delivery',
      data: { order },
      navigation: chefNavigation(LINKS.chefHistory),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// GET /api/chef/history — own prepared orders (read-only).
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

module.exports = { requests, prepare, history };
