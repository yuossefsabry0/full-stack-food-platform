'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const prisma = require('../../src/config/database');

const orderServicePath = require.resolve('../../src/services/order.service');
const cartControllerPath = require.resolve('../../src/controllers/cart.controller');

const BASE_PREVIEW = {
  cartId: 1,
  count: 2,
  productsTotal: 20,
  deliveryFee: 50,
  totalAmount: 70,
};

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

describe('cart confirm preview eligibility fields (mocked)', () => {
  let origOrderService;
  let origOrderModel;

  beforeEach(() => {
    origOrderService = require.cache[orderServicePath];
    require.cache[orderServicePath] = {
      id: orderServicePath,
      filename: orderServicePath,
      loaded: true,
      exports: { previewConfirm: async () => ({ ...BASE_PREVIEW }) },
    };
    delete require.cache[cartControllerPath];
    origOrderModel = prisma.order;
  });

  afterEach(() => {
    if (origOrderService) {
      require.cache[orderServicePath] = origOrderService;
    } else {
      delete require.cache[orderServicePath];
    }
    delete require.cache[cartControllerPath];
    prisma.order = origOrderModel;
  });

  async function runConfirm(activeRow) {
    prisma.order = { findFirst: async () => activeRow };
    const cartController = require('../../src/controllers/cart.controller');
    const req = { user: { id: 42 } };
    const res = mockRes();
    let nextErr = null;
    await cartController.confirm(req, res, (e) => { nextErr = e; });
    return { res, nextErr };
  }

  it('reports canCheckout true and activeOrderId null with no active order', async () => {
    const { res, nextErr } = await runConfirm(null);
    assert.equal(nextErr, null);
    assert.equal(res.statusCode, 200);
    const preview = res.body.data.preview;
    assert.equal(preview.canCheckout, true);
    assert.equal(preview.activeOrderId, null);
    assert.equal(preview.cartId, 1);
    assert.equal(preview.totalAmount, 70);
  });

  it('reports canCheckout false and the active order id otherwise', async () => {
    const { res } = await runConfirm({ id: 7 });
    const preview = res.body.data.preview;
    assert.equal(preview.canCheckout, false);
    assert.equal(preview.activeOrderId, 7);
    assert.equal(typeof preview.canCheckout, 'boolean');
  });
});
