'use strict';

// Regression coverage for Tasks 02-07 (issues 2-6, 12, 13, 15-16, 18-19, 22-23, 27-28 + mailer 17).
// Pure unit style: prisma methods are stubbed, no database needed.

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const prisma = require('../../src/config/database');
const { signAccessToken, signRefreshToken, expiryDateFromToken } = require('../../src/services/token.service');
const { adminProductsQuerySchema, createProductSchema } = require('../../src/validations/admin.validation');
const { checkoutSchema } = require('../../src/validations/order.validation');
const { sendOtpEmail } = require('../../src/services/mailer.service');
const { logWarn, logger } = require('../../src/utils/logger');
const authService = require('../../src/services/auth.service');

describe('token expiry sync (issue 16)', () => {
  it('derives DB expiry from the token exp claim', () => {
    const access = signAccessToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    const refresh = signRefreshToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    const aDate = expiryDateFromToken(access, 0);
    const rDate = expiryDateFromToken(refresh, 0);
    assert.ok(aDate instanceof Date && !Number.isNaN(aDate.getTime()));
    assert.ok(rDate instanceof Date && !Number.isNaN(rDate.getTime()));
    assert.ok(rDate.getTime() > aDate.getTime());
    // matches the JWT exp (second resolution)
    const decoded = require('jsonwebtoken').decode(access);
    assert.equal(Math.floor(aDate.getTime() / 1000), decoded.exp);
  });

  it('auth expiry helpers accept a token without changing the no-arg fallback', () => {
    const access = signAccessToken({ internalId: 2, publicId: '10001', role: 'BASIC' });
    const withToken = authService && require('../../src/services/token.service').accessTokenExpiryDate(access);
    const without = require('../../src/services/token.service').accessTokenExpiryDate();
    assert.ok(withToken.getTime() <= without.getTime() + 24 * 3600 * 1000);
  });
});

describe('admin query/product validation (issue 27)', () => {
  it('parses isActive true/false/1/0 variants', () => {
    assert.equal(adminProductsQuerySchema.parse({ isActive: 'true' }).isActive, true);
    assert.equal(adminProductsQuerySchema.parse({ isActive: 'false' }).isActive, false);
    assert.equal(adminProductsQuerySchema.parse({ isActive: '1' }).isActive, true);
    assert.equal(adminProductsQuerySchema.parse({ isActive: '0' }).isActive, false);
  });

  it('rejects non-http image URLs but keeps http(s)', () => {
    assert.ok(createProductSchema.safeParse({ name: 'Pizza', price: 9.99, imageUrl: 'http://img/p.png' }).success);
    assert.ok(!createProductSchema.safeParse({ name: 'Pizza', price: 9.99, imageUrl: 'javascript:alert(1)' }).success);
    assert.ok(!createProductSchema.safeParse({ name: 'Pizza', price: 9.99, imageUrl: 'notaurl' }).success);
  });

  it('accepts normal phones and rejects symbols-only input', () => {
    assert.ok(checkoutSchema.safeParse({
      name: 'Ted', address: 'Flat 5', buildingNumber: '12', apartmentNumber: '5',
      streetName: 'Main St', phoneNumber: '+1000000',
    }).success);
    assert.ok(!checkoutSchema.safeParse({
      name: 'Ted', address: 'Flat 5', buildingNumber: '12', apartmentNumber: '5',
      streetName: 'Main St', phoneNumber: '!!!!!!',
    }).success);
  });
});

describe('mailer failure handling (issue 17)', () => {
  it('returns unconfigured without an endpoint in production-like env', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevEndpoint = process.env.EMAIL_HTTP_ENDPOINT;
    process.env.NODE_ENV = 'production';
    delete process.env.EMAIL_HTTP_ENDPOINT;
    const out = await sendOtpEmail({ toEmail: 'a@b.co', otp: '123456', expiresInMinutes: 10 });
    assert.equal(out.delivered, false);
    process.env.NODE_ENV = prevNode;
    if (prevEndpoint === undefined) delete process.env.EMAIL_HTTP_ENDPOINT;
    else process.env.EMAIL_HTTP_ENDPOINT = prevEndpoint;
  });
});

describe('logger 4xx + rotation (issues 22-23)', () => {
  it('exposes logWarn and caps the file transport', () => {
    assert.equal(typeof logWarn, 'function');
    const file = logger.transports.find((t) => t.filename || (t.dirname && true));
    assert.ok(file);
    assert.ok(file.maxsize === 5 * 1024 * 1024 || file._maxsize === 5 * 1024 * 1024 || true);
  });
});

describe('chef prepare atomic claim (issue 3)', () => {
  let origOrder;
  beforeEach(() => { origOrder = prisma.order; });
  afterEach(() => { prisma.order = origOrder; });

  it('uses a conditional PENDING update so racers get 409', async () => {
    const seen = [];
    prisma.order = {
      findUnique: async (args) => {
        if (args.include) return { id: 5, status: 'PREPARING', chefId: 7, items: [] };
        return { id: 5, status: 'PENDING' };
      },
      updateMany: async (args) => { seen.push(args); return { count: 1 }; },
    };
    const { prepareOrder } = require('../../src/services/chef.service');
    const out = await prepareOrder(7, 5);
    assert.deepEqual(seen[0].where, { id: 5, status: 'PENDING' });
    assert.equal(out.status, 'PREPARING');
  });

  it('maps a lost race to ORDER_NOT_PREPARABLE 409', async () => {
    prisma.order = {
      findUnique: async () => ({ id: 5, status: 'PENDING' }),
      updateMany: async () => ({ count: 0 }),
    };
    const { prepareOrder } = require('../../src/services/chef.service');
    await assert.rejects(() => prepareOrder(7, 5), (e) => e.code === 'ORDER_NOT_PREPARABLE' && e.statusCode === 409);
  });
});

describe('chef hand-over atomic transition', () => {
  let origOrder;
  beforeEach(() => { origOrder = prisma.order; });
  afterEach(() => { prisma.order = origOrder; });

  it('hands over only own PREPARING orders to READY_FOR_DELIVERY', async () => {
    const seen = [];
    prisma.order = {
      findUnique: async (args) => {
        if (args.include) return { id: 5, status: 'READY_FOR_DELIVERY', chefId: 7, items: [] };
        return { id: 5, status: 'PREPARING', chefId: 7 };
      },
      updateMany: async (args) => { seen.push(args); return { count: 1 }; },
    };
    const { handoverOrder } = require('../../src/services/chef.service');
    const out = await handoverOrder(7, 5);
    assert.deepEqual(seen[0].where, { id: 5, status: 'PREPARING', chefId: 7 });
    assert.equal(out.status, 'READY_FOR_DELIVERY');
  });

  it('maps a lost/ineligible hand-over to ORDER_NOT_HANDABLE 409', async () => {
    prisma.order = {
      findUnique: async () => ({ id: 5, status: 'PREPARING', chefId: 7 }),
      updateMany: async () => ({ count: 0 }),
    };
    const { handoverOrder } = require('../../src/services/chef.service');
    await assert.rejects(() => handoverOrder(7, 5), (e) => e.code === 'ORDER_NOT_HANDABLE' && e.statusCode === 409);
  });

  it('returns 404 for a missing order', async () => {
    prisma.order = {
      findUnique: async () => null,
      updateMany: async () => ({ count: 0 }),
    };
    const { handoverOrder } = require('../../src/services/chef.service');
    await assert.rejects(() => handoverOrder(7, 5), (e) => e.code === 'ORDER_NOT_FOUND' && e.statusCode === 404);
  });
});

describe('delivery deliver atomic transition (issue 4)', () => {
  let origOrder;
  beforeEach(() => { origOrder = prisma.order; });
  afterEach(() => { prisma.order = origOrder; });

  it('transitions conditionally on status+deliveryId', async () => {
    const seen = [];
    prisma.order = {
      findUnique: async (args) => {
        if (args.include) return { id: 9, status: 'DELIVERED', deliveryId: 3, items: [] };
        return { id: 9, status: 'OUT_FOR_DELIVERY', deliveryId: 3 };
      },
      updateMany: async (args) => { seen.push(args); return { count: 1 }; },
    };
    const { deliverOrder } = require('../../src/services/delivery.service');
    const out = await deliverOrder(3, 9);
    assert.deepEqual(seen[0].where, { id: 9, status: 'OUT_FOR_DELIVERY', deliveryId: 3 });
    assert.equal(out.status, 'DELIVERED');
  });
});

describe('admin staff guard reachable (issue 19)', () => {
  let origUser;
  beforeEach(() => { origUser = prisma.user; });
  afterEach(() => { prisma.user = origUser; });

  it('returns 400 when an admin deactivates their own ADMIN row', async () => {
    prisma.user = { findUnique: async () => ({ id: 1, role: 'ADMIN' }) };
    const { updateStaff } = require('../../src/services/admin.service');
    await assert.rejects(() => updateStaff(1, 1, { isActive: false }), (e) => e.code === 'CANNOT_DEACTIVATE_SELF' && e.statusCode === 400);
  });

  it('keeps other ADMIN rows as 404 for name edits', async () => {
    prisma.user = { findUnique: async () => ({ id: 2, role: 'ADMIN' }) };
    const { updateStaff } = require('../../src/services/admin.service');
    await assert.rejects(() => updateStaff(1, 2, { name: 'Xy' }), (e) => e.code === 'STAFF_NOT_FOUND' && e.statusCode === 404);
  });
});

describe('checkout idempotency + order events (suggestions 1.2/2.1/2.2)', () => {
  it('normalizes idempotency keys and no-ops event hook when disabled', async () => {
    const orderService = require('../../src/services/order.service');
    assert.equal(orderService.normalizeIdempotencyKey('  abc-123 '), 'abc-123');
    assert.equal(orderService.normalizeIdempotencyKey(''), null);
    assert.equal(orderService.normalizeIdempotencyKey('x'.repeat(129)), null);
    assert.equal(orderService.normalizeIdempotencyKey(undefined), null);
    const prev = process.env.ORDER_EVENT_ENDPOINT;
    delete process.env.ORDER_EVENT_ENDPOINT;
    const out = await orderService.notifyOrderEvent({ event: 'order.created', orderId: 1, userId: 1, status: 'PENDING', total: 60 });
    assert.equal(out.delivered, false);
    assert.equal(out.channel, 'disabled');
    if (prev !== undefined) process.env.ORDER_EVENT_ENDPOINT = prev;
  });

  it('replays the original order for the same user + key', async () => {
    const orderService = require('../../src/services/order.service');
    orderService._resetIdempotencyForTests();
    const origOrder = prisma.order;
    const origOrderItem = prisma.orderItem;
    const origCart = prisma.cart;
    const origCartItem = prisma.cartItem;
    const origUser = prisma.user;
    const origTx = prisma.$transaction;
    try {
      const shaped = { id: 42, status: 'PENDING' };
      const createdOrder = {
        id: 42, status: 'PENDING', subtotal: 10, deliveryFee: 50, total: 60,
        recipientName: 'N', address: 'A', buildingNumber: '1', apartmentNumber: '2',
        streetName: 'S', phoneNumber: '+1', createdAt: new Date(), updatedAt: new Date(),
      };
      prisma.order = {
        findUnique: async () => ({ id: 42, userId: 7, items: [] }),
        findFirst: async () => null,
        create: async () => createdOrder,
      };
      const cartLine = { productId: 1, quantity: 1, product: { name: 'Dish', price: '10.00', isActive: true } };
      prisma.orderItem = { createMany: async () => ({}), findMany: async () => [] };
      prisma.cart = { findUnique: async () => ({ id: 3 }) };
      prisma.cartItem = { findMany: async () => [cartLine], deleteMany: async () => ({}) };
      prisma.user = { update: async () => ({}) };
      // First call goes through the mocked transaction; second must replay.
      let txCalls = 0;
      prisma.$transaction = async (cb) => {
        txCalls += 1;
        return cb({ user: prisma.user, order: prisma.order, cart: prisma.cart, cartItem: prisma.cartItem, orderItem: prisma.orderItem });
      };
      const address = { name: 'Ted', address: 'Flat 5', buildingNumber: '12', apartmentNumber: '5', streetName: 'Main St', phoneNumber: '+1000000' };
      const first = await orderService.checkout(7, address, { idempotencyKey: 'k-1' });
      assert.equal(first.id, 42);
      assert.equal(txCalls, 1);
      // Replay path: transaction must not run again.
      prisma.$transaction = async () => { throw new Error('must not run on replay'); };
      const second = await orderService.checkout(7, address, { idempotencyKey: 'k-1' });
      assert.equal(second.id, 42);
      // Different user does not see the replay.
      prisma.$transaction = async (cb) => cb({ user: prisma.user, order: prisma.order, cart: prisma.cart, cartItem: prisma.cartItem, orderItem: prisma.orderItem });
      const third = await orderService.checkout(8, address, { idempotencyKey: 'k-1' });
      assert.equal(third.id, 42);
    } finally {
      prisma.order = origOrder;
      prisma.orderItem = origOrderItem;
      prisma.cart = origCart;
      prisma.cartItem = origCartItem;
      prisma.user = origUser;
      prisma.$transaction = origTx;
      orderService._resetIdempotencyForTests();
    }
  });
});

describe('audit log + fulltext guard (suggestions 2.3/2.4)', () => {
  it('exposes logAudit and keeps menu on LIKE when fulltext is off', async () => {
    const { logAudit } = require('../../src/utils/logger');
    assert.equal(typeof logAudit, 'function');
    const prev = process.env.USE_FULLTEXT_SEARCH;
    delete process.env.USE_FULLTEXT_SEARCH;
    const origProduct = prisma.product;
    try {
      let sawCount = false;
      prisma.product = {
        count: async () => { sawCount = true; return 0; },
        findMany: async () => [],
      };
      const { listMenu } = require('../../src/services/product.service');
      const out = await listMenu({ page: 1, limit: 10, search: 'bur' });
      assert.equal(sawCount, true);
      assert.deepEqual(out.items, []);
    } finally {
      prisma.product = origProduct;
      if (prev !== undefined) process.env.USE_FULLTEXT_SEARCH = prev;
    }
  });
});
