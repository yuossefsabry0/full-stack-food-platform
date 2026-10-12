'use strict';

const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// Site notifications: any authenticated role has its own inbox
// (BASIC order updates + every role's own login/register rows).
router.use(requireAuth);

router.get('/unread-count', notificationController.unreadCount);
router.patch('/read-all', notificationController.readAll);
router.patch('/:id/read', notificationController.readOne);
router.get('/', notificationController.list);

module.exports = router;
