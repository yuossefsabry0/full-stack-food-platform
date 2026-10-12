'use strict';

const prisma = require('../config/database');

// Site notifications (in-app bell): best-effort persistence for every user
// action (register / login) and every order event (placement + each status
// change). All helpers NEVER throw and NEVER change API responses — a
// missing table / mocked prisma / DB error simply resolves to a safe empty
// value so existing flows keep working (same pattern as the idempotency L2
// and the order-event outbox).

function isAvailable() {
  try {
    const delegate = prisma && prisma.notification;
    if (!delegate || typeof delegate.create !== 'function') return false;
    // Mocked prisma in unit tests replaces delegates with plain objects
    // lacking the real delegate marker `.fields` — skip DB in that case.
    if (!delegate.fields) return false;
    return true;
  } catch {
    return false;
  }
}

function toShape(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body || null,
    orderId: row.orderId === undefined ? null : row.orderId,
    isRead: Boolean(row.isRead),
    createdAt: row.createdAt,
  };
}

async function createNotification(userId, { type, title, body, orderId } = {}) {
  try {
    if (!userId || !title) return null;
    if (!isAvailable()) return null;
    const row = await prisma.notification.create({
      data: {
        userId,
        type: typeof type === 'string' && type ? type.slice(0, 60) : 'GENERAL',
        title: String(title).slice(0, 190),
        body: body === undefined || body === null ? null : String(body).slice(0, 500),
        orderId: orderId === undefined || orderId === null ? null : Number(orderId),
      },
    });
    return toShape(row);
  } catch {
    return null;
  }
}

// Titles/bodies mirror the notification panel copy: placement confirms the
// total, every status change names the new status.
function orderStatusCopy(orderId, status, total) {
  const id = `#${orderId}`;
  switch (status) {
    case 'PENDING':
      return {
        type: 'ORDER_PLACED',
        title: 'Order placed successfully',
        body: `We received order ${id}${total !== undefined && total !== null ? ` · total $${Number(total).toFixed(2)}` : ''}.`,
      };
    case 'PREPARING':
      return {
        type: 'ORDER_STATUS',
        title: 'Your order is being prepared',
        body: `The chef received order ${id} and started cooking.`,
      };
    case 'READY_FOR_DELIVERY':
      return {
        type: 'ORDER_STATUS',
        title: `Order ${id} is ready for delivery`,
        body: 'Your order is packed and waiting for a courier.',
      };
    case 'OUT_FOR_DELIVERY':
      return {
        type: 'ORDER_STATUS',
        title: `Order ${id} is on the way`,
        body: 'The courier is delivering your order.',
      };
    case 'DELIVERED':
      return {
        type: 'ORDER_STATUS',
        title: `Order ${id} delivered`,
        body: 'Enjoy your meal! Rate your experience.',
      };
    default:
      return {
        type: 'ORDER_STATUS',
        title: `Order ${id} updated`,
        body: `Status changed to ${status}.`,
      };
  }
}

async function notifyOrderStatus(userId, orderId, status, total) {
  try {
    const copy = orderStatusCopy(orderId, status, total);
    return await createNotification(userId, { ...copy, orderId });
  } catch {
    return null;
  }
}

async function listNotifications(userId, { page, limit, unreadOnly, ordersOnly } = {}) {
  const p = Number.isFinite(Number(page)) && Number(page) > 0 ? Math.floor(Number(page)) : 1;
  const l = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Math.floor(Number(limit)), 50) : 20;
  try {
    if (!isAvailable()) return { items: [], meta: { page: p, limit: l, total: 0, totalPages: 0 }, unreadCount: 0 };
    const where = { userId };
    if (unreadOnly) where.isRead = false;
    if (ordersOnly) where.OR = [{ orderId: { not: null } }, { type: { startsWith: 'ORDER_' } }];
    const [total, unreadCount, rows] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
    ]);
    return {
      items: rows.map(toShape),
      meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
      unreadCount,
    };
  } catch {
    return { items: [], meta: { page: p, limit: l, total: 0, totalPages: 0 }, unreadCount: 0 };
  }
}

async function countUnread(userId) {
  try {
    if (!isAvailable()) return { unreadCount: 0 };
    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
    return { unreadCount };
  } catch {
    return { unreadCount: 0 };
  }
}

async function markAllRead(userId) {
  try {
    if (!isAvailable()) return { updated: 0 };
    const res = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { updated: res && typeof res.count === 'number' ? res.count : 0 };
  } catch {
    return { updated: 0 };
  }
}

async function markOneRead(userId, id) {
  try {
    if (!isAvailable()) return null;
    const existing = await prisma.notification.findUnique({ where: { id: Number(id) } });
    if (!existing || existing.userId !== userId) {
      const err = new Error('Notification not found');
      err.statusCode = 404;
      err.code = 'NOTIFICATION_NOT_FOUND';
      throw err;
    }
    if (existing.isRead) return toShape(existing);
    const updated = await prisma.notification.update({ where: { id: existing.id }, data: { isRead: true } });
    return toShape(updated);
  } catch (err) {
    if (err && err.statusCode) throw err;
    return null;
  }
}

module.exports = {
  createNotification,
  notifyOrderStatus,
  orderStatusCopy,
  listNotifications,
  countUnread,
  markAllRead,
  markOneRead,
  toShape,
};
