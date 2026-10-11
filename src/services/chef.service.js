'use strict';

const prisma = require('../config/database');
const { toOrderShape } = require('./order.service');

function toChefOrderShape(order, items) {
  return {
    ...toOrderShape(order, items),
    chefId: order.chefId || null,
    preparedAt: order.preparedAt || null,
  };
}

async function listRequestOrders() {
  // Active kitchen queue: new PENDING orders plus PREPARING ones the chef
  // accepted but has not handed to delivery yet. READY_FOR_DELIVERY orders
  // never appear here (delivery owns them after the hand-over).
  const rows = await prisma.order.findMany({
    where: { status: { in: ['PENDING', 'PREPARING'] } },
    include: { items: { orderBy: { id: 'asc' } } },
    orderBy: { id: 'asc' },
  });
  return rows.map((order) => toChefOrderShape(order, order.items));
}

async function prepareOrder(chefUserId, orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    err.code = 'ORDER_NOT_FOUND';
    throw err;
  }
  // Accept step: atomic conditional claim so exactly one concurrent preparer
  // can match this PENDING row; losers get the standard 409 instead of
  // overwriting chefId. Sets PREPARING (visible to the user as preparing);
  // delivery only sees the order after the separate hand-over step.
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, status: 'PENDING' },
    data: { status: 'PREPARING', chefId: chefUserId, preparedAt: new Date() },
  });
  if (claimed.count !== 1) {
    const err = new Error('Only pending orders can be prepared');
    err.statusCode = 409;
    err.code = 'ORDER_NOT_PREPARABLE';
    throw err;
  }
  const updated = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: 'asc' } } },
  });
  return toChefOrderShape(updated, updated.items);
}

async function handoverOrder(chefUserId, orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    err.code = 'ORDER_NOT_FOUND';
    throw err;
  }
  // Hand-over step: only the accepting chef, only while PREPARING, can move
  // the order to READY_FOR_DELIVERY (where delivery can accept it). The user
  // status display does not advance on hand-over. Atomic like prepare.
  const handed = await prisma.order.updateMany({
    where: { id: orderId, status: 'PREPARING', chefId: chefUserId },
    data: { status: 'READY_FOR_DELIVERY' },
  });
  if (handed.count !== 1) {
    const err = new Error('Only preparing orders accepted by you can be handed over');
    err.statusCode = 409;
    err.code = 'ORDER_NOT_HANDABLE';
    throw err;
  }
  const updated = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: 'asc' } } },
  });
  return toChefOrderShape(updated, updated.items);
}

async function listPreviousOrders(chefUserId, { page, limit }) {
  // History = my orders already handed to delivery (PREPARING ones still
  // awaiting hand-over stay in requests, not history).
  const where = { chefId: chefUserId, status: { not: 'PREPARING' } };
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: { orderBy: { id: 'asc' } } },
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    items: rows.map((order) => toChefOrderShape(order, order.items)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = { listRequestOrders, prepareOrder, handoverOrder, listPreviousOrders };
