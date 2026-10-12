'use strict';

const { listNotifications, countUnread, markAllRead, markOneRead } = require('../services/notification.service');
const { success, error } = require('../utils/response');

function serviceError(res, err) {
  if (err && err.statusCode) {
    return error(res, {
      message: err.message,
      code: err.code || 'ERROR',
      errors: err.errors || null,
      statusCode: err.statusCode,
    });
  }
  return null;
}

// GET /api/notifications — own notifications, newest first.
// ?filter=all|unread|orders (+ ?page=&limit=). Backward compatible: the
// default filter returns everything; unreadCount is always included so the
// bell dot never needs a second request.
async function list(req, res, next) {
  try {
    const q = req.query || {};
    const page = q.page !== undefined ? Number(q.page) : 1;
    const limit = q.limit !== undefined ? Number(q.limit) : 20;
    const filter = typeof q.filter === 'string' ? q.filter : 'all';
    if ((q.page !== undefined && (!Number.isInteger(page) || page < 1)) || (q.limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 50))) {
      return error(res, { message: 'Invalid pagination', code: 'VALIDATION_ERROR', statusCode: 400 });
    }
    if (!['all', 'unread', 'orders'].includes(filter)) {
      return error(res, { message: 'Invalid filter', code: 'VALIDATION_ERROR', statusCode: 400 });
    }
    const { items, meta, unreadCount } = await listNotifications(req.user.id, {
      page,
      limit,
      unreadOnly: filter === 'unread',
      ordersOnly: filter === 'orders',
    });
    return success(res, { message: 'Notifications', data: { items, unreadCount }, meta });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// GET /api/notifications/unread-count — bell dot state (no count displayed,
// only whether any unread exists; the number stays server-side).
async function unreadCount(req, res, next) {
  try {
    const { unreadCount: unread } = await countUnread(req.user.id);
    return success(res, { message: 'Unread count', data: { unreadCount: unread, hasUnread: unread > 0 } });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// PATCH /api/notifications/read-all — "Mark all as read".
async function readAll(req, res, next) {
  try {
    const { updated } = await markAllRead(req.user.id);
    return success(res, { message: 'All notifications marked as read', data: { updated } });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

// PATCH /api/notifications/:id/read — mark one as read (scoped to owner).
async function readOne(req, res, next) {
  try {
    const id = Number(req.params && req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return error(res, { message: 'Invalid notification id', code: 'VALIDATION_ERROR', statusCode: 400 });
    }
    const item = await markOneRead(req.user.id, id);
    if (!item) return success(res, { message: 'Notification', data: { item: null } });
    return success(res, { message: 'Notification marked as read', data: { item } });
  } catch (err) {
    return serviceError(res, err) || next(err);
  }
}

module.exports = { list, unreadCount, readAll, readOne };
