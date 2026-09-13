'use strict';

const express = require('express');
const homeController = require('../controllers/home.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// Future Home entrypoint — protected, requires a valid Access Token.
router.get('/', requireAuth, homeController.home);

module.exports = router;
