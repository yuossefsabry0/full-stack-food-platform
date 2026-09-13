'use strict';

const { listMenu, getProductDetails } = require('../services/product.service');
const { success, error } = require('../utils/response');
const { LINKS } = require('../utils/navigation');

function shopNavigation() {
  return { links: [LINKS.menu, LINKS.cart, LINKS.home] };
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

// GET /api/products — Menu with optional search + pagination.
async function menu(req, res, next) {
  try {
    const { page, limit, search } = req.validatedQuery;
    const { items, meta } = await listMenu({ page, limit, search });
    return success(res, {
      message: search ? `Menu search results for "${search}"` : 'Menu',
      data: { items },
      navigation: { ...shopNavigation(), next: LINKS.cart },
      meta,
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// GET /api/products/:id — Product Details with the Add to Cart concept.
async function details(req, res, next) {
  try {
    const product = await getProductDetails(req.validatedParams.id);
    return success(res, {
      message: 'Product details',
      data: { product },
      navigation: {
        ...shopNavigation(),
        next: { method: 'POST', href: '/api/cart/items', label: 'Add to Cart' },
      },
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

module.exports = { menu, details };
