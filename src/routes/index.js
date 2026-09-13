'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapiDocument = require('../../docs/openapi.json');
const authRoutes = require('./auth.routes');
const homeRoutes = require('./home.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const chefRoutes = require('./chef.routes');
const deliveryRoutes = require('./delivery.routes');
const adminRoutes = require('./admin.routes');
const { success } = require('../utils/response');

const router = express.Router();

router.get('/health', (req, res) =>
  success(res, { message: 'API is running', data: { status: 'ok' } })
);

// Swagger: interactive UI + machine-readable OpenAPI document.
router.get('/docs.json', (req, res) => res.json(openapiDocument));
router.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

router.use('/auth', authRoutes);
router.use('/home', homeRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/chef', chefRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
