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
  const rows = await prisma.order.findMany({
    where: { status: 'PENDING' },
    include: { items: { orderBy: { id: 'asc' } } },
    orderBy: { id: 'asc' },
  });
  return rows.map((order) => toChefOrderShape(order, order.items));
}

async function prepareOrder(chefUserId, orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: 'asc' } } },
  });
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    err.code = 'ORDER_NOT_FOUND';
    throw err;
  }
  if (order.status !== 'PENDING') {
    const err = new Error('Only pending orders can be prepared');
    err.statusCode = 409;
    err.code = 'ORDER_NOT_PREPARABLE';
    throw err;
  }
  // Single atomic step through the preparation stage to READY_FOR_DELIVERY.
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'READY_FOR_DELIVERY', chefId: chefUserId, preparedAt: new Date() },
    include: { items: { orderBy: { id: 'asc' } } },
  });
  return toChefOrderShape(updated, updated.items);
}

async function listPreviousOrders(chefUserId, { page, limit }) {
  const where = { chefId: chefUserId };
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

module.exports = { listRequestOrders, prepareOrder, listPreviousOrders };
