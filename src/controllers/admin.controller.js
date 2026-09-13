'use strict';

const {
  listUsers,
  listProducts,
  createProduct,
  updateProduct,
  listOrders,
  listStaff,
  createStaff,
  updateStaff,
} = require('../services/admin.service');
const { success, error } = require('../utils/response');
const { LINKS } = require('../utils/navigation');

function adminNavigation() {
  return {
    links: [
      LINKS.adminDashboard,
      LINKS.adminUsers,
      LINKS.adminProducts,
      LINKS.adminOrders,
      LINKS.adminStaff,
      LINKS.adminAnalytics,
    ],
  };
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

function paged(res, { message, items, meta, next }) {
  const navigation = adminNavigation();
  if (next) navigation.next = next;
  return success(res, { message, data: { items }, navigation, meta });
}

// GET /api/admin — Admin Dashboard entrypoint (ADMIN only).
async function dashboard(req, res) {
  return success(res, {
    message: `Admin Dashboard — welcome, ${req.user.name}`,
    data: { user: { userCode: req.user.publicId, name: req.user.name, username: req.user.username, role: req.user.role } },
    navigation: { ...adminNavigation(), next: LINKS.adminOrders },
  });
}

// GET /api/admin/users — customers/users (name, username, code, email only).
async function users(req, res, next) {
  try {
    const { items, meta } = await listUsers(req.validatedQuery);
    return paged(res, { message: 'Users', items, meta });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// GET /api/admin/products — all products incl. inactive.
async function products(req, res, next) {
  try {
    const { items, meta } = await listProducts(req.validatedQuery);
    return paged(res, { message: 'Products', items, meta });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// POST /api/admin/products — add a product.
async function addProduct(req, res, next) {
  try {
    const product = await createProduct(req.body);
    return success(res, {
      message: 'Product created',
      data: { product },
      navigation: adminNavigation(),
      statusCode: 201,
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// PATCH /api/admin/products/:id — edit / activate / deactivate (soft only).
async function editProduct(req, res, next) {
  try {
    const product = await updateProduct(req.validatedParams.id, req.body);
    return success(res, {
      message: 'Product updated',
      data: { product },
      navigation: adminNavigation(),
    });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// GET /api/admin/orders — all orders + filters + pagination + sorting.
async function orders(req, res, next) {
  try {
    const { items, meta } = await listOrders(req.validatedQuery);
    return paged(res, { message: 'Orders', items, meta });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// GET /api/admin/staff — CHEF / DELIVERY accounts.
async function staff(req, res, next) {
  try {
    const { items, meta } = await listStaff(req.validatedQuery);
    return paged(res, { message: 'Staff', items, meta });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// POST /api/admin/staff — create CHEF / DELIVERY (ADMIN rejected by schema).
async function addStaff(req, res, next) {
  try {
    const staff = await createStaff(req.body);
    return success(res, {
      message: `${req.body.role} account created`,
      data: { staff },
      navigation: adminNavigation(),
      statusCode: 201,
    });
  } catch (err) {
    if (err && err.code === 'P2002') {
      return error(res, {
        message: 'Username or email is already taken',
        code: 'ACCOUNT_EXISTS',
        statusCode: 409,
      });
    }
    return serviceError(res, err) || next(err);
  }
}

// PATCH /api/admin/staff/:id — edit data / activate / deactivate.
async function editStaff(req, res, next) {
  try {
    const staff = await updateStaff(req.user.id, req.validatedParams.id, req.body);
    return success(res, {
      message: 'Staff account updated',
      data: { staff },
      navigation: adminNavigation(),
    });
  } catch (err) {
    if (err && err.code === 'P2002') {
      return error(res, {
        message: 'Username or email is already taken',
        code: 'ACCOUNT_EXISTS',
        statusCode: 409,
      });
    }
    return serviceError(res, err) || next(err);
  }
}

module.exports = {
  dashboard,
  users,
  products,
  addProduct,
  editProduct,
  orders,
  staff,
  addStaff,
  editStaff,
};
