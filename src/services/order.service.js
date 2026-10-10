'use strict';

const prisma = require('../config/database');
const env = require('../config/env');
const { orderStatusLabel } = require('../utils/orderStatus');

// Orders: totals, delivery address, creation with item snapshots,
// one atomic transaction, single-active-order rule, read-only for BASIC.
//
// - The Order is linked to the user via the INTERNAL user id (userId).
// - Every query is scoped to the current user, so no user can access
//   another user's orders.
// - OrderItems snapshot productName / unitPrice / quantity / lineTotal at
//   creation time; later product changes (price edits, isActive = false)
//   never affect historical orders.

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

// Checkout idempotency (additive, in-memory, single-instance like the rate
// limiter): same user + same Idempotency-Key replays the original order
// instead of creating a second active order. Entries expire after 24h and
// the map is capped; restarts lose keys (documented), in which case the
// single-active-order 409 remains the safety net.
const IDEMPOTENCY_TTL_MS = 24 * 3600 * 1000;
const IDEMPOTENCY_MAX = 1000;
const idempotencyStore = new Map();

function normalizeIdempotencyKey(raw) {
  if (typeof raw !== 'string') return null;
  const key = raw.trim();
  if (!key || key.length > 128) return null;
  return key;
}

function idempotencyGet(userId, key) {
  const entry = idempotencyStore.get(`${userId}:${key}`);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    idempotencyStore.delete(`${userId}:${key}`);
    return null;
  }
  return entry;
}

function idempotencySet(userId, key, orderId) {
  if (idempotencyStore.size >= IDEMPOTENCY_MAX) {
    const oldest = idempotencyStore.keys().next();
    if (!oldest.done) idempotencyStore.delete(oldest.value);
  }
  idempotencyStore.set(`${userId}:${key}`, { orderId, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
}

// Order-event webhook (fire-and-forget, no new dependencies): POSTs a small
// JSON payload to ORDER_EVENT_ENDPOINT after commit. Failures are only
// logged; responses never change. Mirrors the mailer HTTP-hook pattern.
async function notifyOrderEvent({ event, orderId, userId, status, total }) {
  const endpoint = process.env.ORDER_EVENT_ENDPOINT || env.orderEventEndpoint || '';
  if (!endpoint) return { delivered: false, channel: 'disabled' };
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.ORDER_EVENT_API_KEY) headers.Authorization = `Bearer ${process.env.ORDER_EVENT_API_KEY}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ event, orderId, userId, status, total }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`event endpoint status ${res.status}`);
      return { delivered: true, channel: 'http-hook' };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Order event ${event} undelivered for order ${orderId}:`, err && err.message);
    return { delivered: false, channel: 'http-hook' };
  }
}

function toOrderShape(order, items) {
  return {
    id: order.id,
    status: order.status,
    statusLabel: orderStatusLabel(order.status),
    productsTotal: round2(order.subtotal),
    deliveryFee: round2(order.deliveryFee),
    total: round2(order.total),
    address: {
      name: order.recipientName,
      address: order.address,
      buildingNumber: order.buildingNumber,
      apartmentNumber: order.apartmentNumber,
      streetName: order.streetName,
      phoneNumber: order.phoneNumber,
    },
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      unitPrice: round2(item.unitPrice),
      quantity: item.quantity,
      subtotal: round2(item.lineTotal),
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

async function findActiveOrder(userId) {
  return prisma.order.findFirst({
    where: { userId, status: { not: 'DELIVERED' } },
  });
}

async function loadOwnCartItems(userId) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return { cart: null, items: [] };
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: true },
    orderBy: { id: 'asc' },
  });
  return { cart, items };
}

// Confirm Order preview: totals + move to the Delivery Address route.
// Does not create anything; fails on an empty cart.
async function previewConfirm(userId) {
  const { cart, items } = await loadOwnCartItems(userId);
  if (items.length === 0) {
    const err = new Error('Cart is empty');
    err.statusCode = 400;
    err.code = 'CART_EMPTY';
    throw err;
  }
  const productsTotal = round2(
    items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0)
  );
  const deliveryFee = env.deliveryFee;
  return {
    cartId: cart.id,
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    productsTotal,
    deliveryFee,
    totalAmount: round2(productsTotal + deliveryFee),
  };
}

async function checkout(userId, address, options) {
  // Optional idempotency: callers may pass { idempotencyKey } (or the raw
  // header string). Replays return the original order scoped to this user.
  const rawKey = typeof options === 'string' ? options : options && options.idempotencyKey;
  const idempotencyKey = normalizeIdempotencyKey(rawKey);
  if (idempotencyKey) {
    const hit = idempotencyGet(userId, idempotencyKey);
    if (hit) {
      const existing = await prisma.order.findUnique({
        where: { id: hit.orderId },
        include: { items: { orderBy: { id: 'asc' } } },
      });
      if (existing && existing.userId === userId) {
        return toOrderShape(existing, existing.items);
      }
      idempotencyStore.delete(`${userId}:${idempotencyKey}`);
    }
  }
  // One transaction: per-user mutex + active-order check + cart snapshot +
  // order creation + cart clear. The user-row touch serializes concurrent
  // checkouts from the same user (same pattern as delivery accept), so two
  // concurrent checkouts cannot both pass the single-active-order rule.
  const order = await prisma.$transaction(async (tx) => {
    // Per-user mutex: serializes this user's concurrent checkouts.
    await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });

    // BASIC rule: at most one active (non-DELIVERED) order at a time.
    const active = await tx.order.findFirst({
      where: { userId, status: { not: 'DELIVERED' } },
    });
    if (active) {
      const err = new Error('You already have an active order. A new order is possible after it is delivered.');
      err.statusCode = 409;
      err.code = 'ACTIVE_ORDER_EXISTS';
      throw err;
    }

    const cart = await tx.cart.findUnique({ where: { userId } });
    const items = cart
      ? await tx.cartItem.findMany({
          where: { cartId: cart.id },
          include: { product: true },
          orderBy: { id: 'asc' },
        })
      : [];
    if (items.length === 0) {
      const err = new Error('Cart is empty');
      err.statusCode = 400;
      err.code = 'CART_EMPTY';
      throw err;
    }

    const unavailable = items.find((i) => !i.product || !i.product.isActive);
    if (unavailable) {
      const err = new Error(`"${unavailable.product ? unavailable.product.name : 'A product'}" is no longer available. Remove it from the cart to continue.`);
      err.statusCode = 400;
      err.code = 'PRODUCT_NOT_AVAILABLE';
      throw err;
    }

    const productsTotal = round2(
      items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0)
    );
    const deliveryFee = env.deliveryFee;
    const total = round2(productsTotal + deliveryFee);

    const snapshotRows = items.map((i) => ({
      productId: i.productId,
      productName: i.product.name,
      quantity: i.quantity,
      unitPrice: round2(i.product.price),
      lineTotal: round2(Number(i.product.price) * i.quantity),
    }));

    // Cart items are removed only after the complete order succeeds.
    const created = await tx.order.create({
      data: {
        userId,
        status: 'PENDING',
        subtotal: productsTotal,
        deliveryFee,
        total,
        recipientName: address.name,
        address: address.address,
        buildingNumber: address.buildingNumber,
        apartmentNumber: address.apartmentNumber,
        streetName: address.streetName,
        phoneNumber: address.phoneNumber,
      },
    });
    await tx.orderItem.createMany({
      data: snapshotRows.map((row) => ({ ...row, orderId: created.id })),
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return created;
  });

  const orderItems = await prisma.orderItem.findMany({
    where: { orderId: order.id },
    orderBy: { id: 'asc' },
  });
  const shaped = toOrderShape(order, orderItems);
  if (idempotencyKey) idempotencySet(userId, idempotencyKey, order.id);
  // Fire-and-forget: never blocks or fails checkout.
  void notifyOrderEvent({
    event: 'order.created',
    orderId: order.id,
    userId,
    status: order.status,
    total: Number(order.total),
  });
  return shaped;
}

async function listOrders(userId, { page, limit }) {
  const where = { userId };
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
    items: rows.map((order) => toOrderShape(order, order.items)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getOrder(userId, orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: 'asc' } } },
  });
  // Same 404 whether the order does not exist or belongs to someone else.
  if (!order || order.userId !== userId) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    err.code = 'ORDER_NOT_FOUND';
    throw err;
  }
  return toOrderShape(order, order.items);
}

module.exports = {
  previewConfirm,
  checkout,
  listOrders,
  getOrder,
  toOrderShape,
  notifyOrderEvent,
  normalizeIdempotencyKey,
};

// For testing only.
module.exports._resetIdempotencyForTests = () => idempotencyStore.clear();
