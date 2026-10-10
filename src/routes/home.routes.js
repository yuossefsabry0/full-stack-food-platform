'use strict';

const express = require('express');
const homeController = require('../controllers/home.controller');
const { optionalAuth } = require('../middlewares/optionalAuth.middleware');

const router = express.Router();

// Home entrypoint — public browse-only read (guest supported via optional
// authentication). Authenticated requests keep the exact previous behavior;
// unauthenticated requests are treated as guests. Applied only to this GET handler.
router.get('/', optionalAuth, homeController.home);

module.exports = router;
