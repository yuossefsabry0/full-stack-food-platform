'use strict';

const { getSalesAnalytics } = require('../services/analytics.service');
const { success, error } = require('../utils/response');
const { LINKS } = require('../utils/navigation');

// GET /api/admin/analytics — product sales + total sales (ADMIN only).
// DELIVERED orders exclusively; carts and undelivered orders never count.
// Optional ?dateBasis=created|delivered selects the bucketing date.
async function summary(req, res, next) {
  try {
    const dateBasis = (req.validatedQuery && req.validatedQuery.dateBasis) || 'created';
    const analytics = await getSalesAnalytics(new Date(), dateBasis);
    return success(res, {
      message: 'Sales analytics',
      data: { analytics },
      navigation: {
        links: [LINKS.adminDashboard, LINKS.adminOrders, LINKS.adminProducts],
        next: LINKS.adminOrders,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return error(res, {
        message: err.message,
        code: err.code || 'ERROR',
        errors: err.errors || null,
        statusCode: err.statusCode,
      });
    }
    return next(err);
  }
}

module.exports = { summary };
