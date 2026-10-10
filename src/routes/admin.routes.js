'use strict';

const express = require('express');
const adminController = require('../controllers/admin.controller');
const analyticsController = require('../controllers/analytics.controller');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  adminUsersQuerySchema,
  adminProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  adminOrdersQuerySchema,
  createStaffSchema,
  updateStaffSchema,
  adminStaffQuerySchema,
  staffIdParamSchema,
  analyticsQuerySchema,
} = require('../validations/admin.validation');

const router = express.Router();

// Admin Dashboard: every route verifies ADMIN (no other role may enter).
// There is intentionally NO public create-admin endpoint — ADMIN accounts
// are created only through source code / database seed (prisma/seed.js).
router.use(requireAuth, requireRole('ADMIN'));

// Dashboard entrypoint.
router.get('/', adminController.dashboard);

// Customer/user management (limited fields, paginated).
router.get('/users', validate.query(adminUsersQuerySchema), adminController.users);

// Product management: view / add / edit / activate / deactivate.
// No DELETE route exists — products linked to history are only soft-deactivated.
router.get('/products', validate.query(adminProductsQuerySchema), adminController.products);
router.post('/products', validate(createProductSchema), adminController.addProduct);
router.patch(
  '/products/:id',
  validate.params(productIdParamSchema),
  validate(updateProductSchema),
  adminController.editProduct
);

// Order management: filters + pagination + sorting.
router.get('/orders', validate.query(adminOrdersQuerySchema), adminController.orders);

// Analytics: DELIVERED-only product sales + total sales.
router.get('/analytics', validate.query(analyticsQuerySchema), analyticsController.summary);

// CHEF / DELIVERY management: view / create / edit / activate / deactivate.
// No DELETE route exists — historical orders keep their chefId/deliveryId.
router.get('/staff', validate.query(adminStaffQuerySchema), adminController.staff);
router.post('/staff', validate(createStaffSchema), adminController.addStaff);
router.patch(
  '/staff/:id',
  validate.params(staffIdParamSchema),
  validate(updateStaffSchema),
  adminController.editStaff
);

module.exports = router;
