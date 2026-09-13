'use strict';

const express = require('express');
const productController = require('../controllers/product.controller');
const validate = require('../middlewares/validate.middleware');
const { menuQuerySchema, productIdParamSchema } = require('../validations/product.validation');

const router = express.Router();

// Menu (public storefront): all available products, optional search,
// paginated via ?page=&limit=&search=.
router.get('/', validate.query(menuQuerySchema), productController.menu);

// Product Details (public): name, price, image, description + Add to Cart.
router.get('/:id', validate.params(productIdParamSchema), productController.details);

module.exports = router;
