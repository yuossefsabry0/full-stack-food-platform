'use strict';

const prisma = require('../config/database');
const { toOrderShape, enqueueOrderEvent } = require('./order.service');
const { orderStatusLabel } = require('../utils/orderStatus');

function toDeliveryOrderShape(order, items, viewerDeliveryId) {
  const base = toOrderShape(order, items);
  const mine = order.deliveryId === viewerDeliveryId;
  const operations = [];
  if (order.status === 'READY_FOR_DELIVERY' && !order.deliveryId) {
    operations.push({ method: 'POST', href: `/api/delivery/orders/${order.id}/accept`, label: 'Accept' });
  }
  // The Delivered operation exists only after successful acceptance by me.
  if (order.status === 'OUT_FOR_DELIVERY' && mine) {
    operations.push({ method: 'POST', href: `/api/delivery/orders/${order.id}/deliver`, label: 'Delivered' });
  }
  return {
    ...base,
    chefId: order.chefId || null,
    deliveryId: order.deliveryId || null,
    acceptedAt: order.acceptedAt || null,
    deliveredAt: order.deliveredAt || null,
    operations,
  };
}

// Limited history shape: name, products, basic info + retained delivery id.
// Address snapshot and per-line prices come from the same order/item fields
// as the Current shape (toOrderShape); createdAt added as well.
function toDeliveryHistoryShape(order, items) {
  return {
    id: order.id,
    status: order.status,
    statusLabel: orderStatusLabel(order.status),
    customerName: order.recipientName,
    address: {
      name: order.recipientName,
      address: order.address,
      buildingNumber: order.buildingNumber,
      apartmentNumber: order.apartmentNumber,
      streetName: order.streetName,
      phoneNumber: order.phoneNumber,
    },
    products: items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Math.round(Number(item.unitPrice) * 100) / 100,
      subtotal: Math.round(Number(item.lineTotal) * 100) / 100,
    })),
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    total: Math.round(Number(order.total) * 100) / 100,
    createdAt: order.createdAt,
    deliveryId: order.deliveryId || null,
    deliveredAt: order.deliveredAt || null,
  };
}

async function listCurrentOrders(viewerDeliveryId) {
  const [ready, mine] = await Promise.all([
    prisma.order.findMany({
      where: { status: 'READY_FOR_DELIVERY' },
      include: { items: { orderBy: { id: 'asc' } } },
      orderBy: { id: 'asc' },
    }),
    prisma.order.findMany({
      where: { deliveryId: viewerDeliveryId, status: 'OUT_FOR_DELIVERY' },
      include: { items: { orderBy: { id: 'asc' } } },
      orderBy: { id: 'asc' },
    }),
  ]);
  const seen = new Set();
  const merged = [...mine, ...ready].filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
  return merged.map((order) => toDeliveryOrderShape(order, order.items, viewerDeliveryId));
}

async function acceptOrder(deliveryUserId, orderId) {
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    err.code = 'ORDER_NOT_FOUND';
    throw err;
  }

  const claimed = await prisma.$transaction(async (tx) => {
    // Per-courier mutex: serializes this courier's concurrent accepts.
    await tx.user.update({ where: { id: deliveryUserId }, data: { updatedAt: new Date() } });

    // One active delivery at a time: no new accept while one is OUT_FOR_DELIVERY.
    const busy = await tx.order.findFirst({
      where: { deliveryId: deliveryUserId, status: 'OUT_FOR_DELIVERY' },
    });
    if (busy) {
      const err = new Error('You already carry an order. Accept a new one after it is delivered.');
      err.statusCode = 409;
      err.code = 'DELIVERY_BUSY';
      throw err;
    }

    // Atomic conditional claim: exactly one racer can match this row.
    const result = await tx.order.updateMany({
      where: { id: orderId, status: 'READY_FOR_DELIVERY', deliveryId: null },
      data: { status: 'OUT_FOR_DELIVERY', deliveryId: deliveryUserId, acceptedAt: new Date() },
    });
    if (result.count !== 1) {
      const err = new Error('Order is no longer available for acceptance');
      err.statusCode = 409;
      err.code = 'ORDER_NOT_ACCEPTABLE';
      throw err;
    }
    return tx.order.findUnique({
      where: { id: orderId },
      include: { items: { orderBy: { id: 'asc' } } },
    });
  });

  // Site notification to the order owner: new status OUT_FOR_DELIVERY.
  try {
    const { notifyOrderStatus } = require('./notification.service');
    void notifyOrderStatus(claimed.userId, claimed.id, 'OUT_FOR_DELIVERY', Number(claimed.total));
  } catch { /* never blocks delivery flow */ }

  return toDeliveryOrderShape(claimed, claimed.items, deliveryUserId);
}

async function deliverOrder(deliveryUserId, orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    err.code = 'ORDER_NOT_FOUND';
    throw err;
  }
  // Only the accepting courier, only while carrying it, can complete it.
  // Conditional transition: a concurrent double-deliver collapses to one
  // winner; the loser re-reads to preserve the 404/409 distinction.
  const transitioned = await prisma.order.updateMany({
    where: { id: orderId, status: 'OUT_FOR_DELIVERY', deliveryId: deliveryUserId },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  });
  if (transitioned.count !== 1) {
    const current = await prisma.order.findUnique({ where: { id: orderId } });
    if (!current) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      err.code = 'ORDER_NOT_FOUND';
      throw err;
    }
    const err = new Error('Order cannot be marked as delivered');
    err.statusCode = 409;
    err.code = 'ORDER_NOT_DELIVERABLE';
    throw err;
  }
  const updated = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: 'asc' } } },
  });
  // No-loss outbox: immediate attempt, persisted for retry on failure.
  // Fire-and-forget: never blocks or fails delivery.
  void enqueueOrderEvent({
    event: 'order.delivered',
    orderId: updated.id,
    userId: updated.userId,
    status: updated.status,
    total: Number(updated.total),
  });
  // Site notification to the order owner: new status DELIVERED.
  try {
    const { notifyOrderStatus } = require('./notification.service');
    void notifyOrderStatus(updated.userId, updated.id, 'DELIVERED', Number(updated.total));
  } catch { /* never blocks delivery flow */ }
  return toDeliveryOrderShape(updated, updated.items, deliveryUserId);
}

async function listPreviousOrders(deliveryUserId, { page, limit }) {
  const where = { deliveryId: deliveryUserId, status: 'DELIVERED' };
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
    items: rows.map((order) => toDeliveryHistoryShape(order, order.items)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = { listCurrentOrders, acceptOrder, deliverOrder, listPreviousOrders, toDeliveryHistoryShape };
