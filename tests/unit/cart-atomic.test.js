'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const prisma = require('../../src/config/database');
const { MAX_QUANTITY } = require('../../src/validations/cart.validation');
const { addToCart } = require('../../src/services/cart.service');

const PRODUCT = { id: 7, isActive: true, name: 'Dish', price: '10.00', imageUrl: null };
const CART = { id: 3 };

describe('addToCart atomic max-quantity check', () => {
  let orig;

  beforeEach(() => {
    orig = { product: prisma.product, cart: prisma.cart, cartItem: prisma.cartItem, tx: prisma.$transaction };
    prisma.product = { findUnique: async () => PRODUCT };
    prisma.cart = {
      findUnique: async () => CART,
      create: async () => CART,
    };
  });

  afterEach(() => {
    prisma.product = orig.product;
    prisma.cart = orig.cart;
    prisma.cartItem = orig.cartItem;
    prisma.$transaction = orig.tx;
  });

  function mockTxBehavior({ existing, updateCount, failCreate }) {
    const seen = { updateMany: [] };
    const tx = {
      cartItem: {
        findUnique: async () => existing,
        create: async () => {
          if (failCreate) {
            const err = new Error('Unique constraint');
            err.code = 'P2002';
            throw err;
          }
          return { id: 1 };
        },
        updateMany: async (args) => { seen.updateMany.push(args); return { count: updateCount }; },
      },
    };
    return { tx, seen };
  }

  it('normal add uses the conditional increment', async () => {
    const { tx, seen } = mockTxBehavior({ existing: { id: 1, quantity: 2 }, updateCount: 1 });
    prisma.$transaction = async (cb) => cb(tx);
    prisma.cartItem = {
      findMany: async () => [{ productId: 7, quantity: 3, product: PRODUCT }],
    };
    const cart = await addToCart(1, 7, 1);
    assert.equal(seen.updateMany.length, 1);
    assert.deepEqual(seen.updateMany[0].where, { cartId: 3, productId: 7, quantity: { lte: MAX_QUANTITY - 1 } });
    assert.deepEqual(seen.updateMany[0].data, { quantity: { increment: 1 } });
    assert.equal(cart.items[0].quantity, 3);
  });

  it('throws QUANTITY_LIMIT_EXCEEDED when the existing line would exceed the max', async () => {
    const { tx, seen } = mockTxBehavior({ existing: { id: 1, quantity: MAX_QUANTITY }, updateCount: 0 });
    prisma.$transaction = async (cb) => cb(tx);
    await assert.rejects(() => addToCart(1, 7, 1), (err) => {
      assert.equal(err.code, 'QUANTITY_LIMIT_EXCEEDED');
      assert.equal(err.statusCode, 400);
      return true;
    });
    assert.equal(seen.updateMany.length, 1);
  });

  it('throws QUANTITY_LIMIT_EXCEEDED when a new line alone exceeds the max', async () => {
    let txUsed = false;
    prisma.$transaction = async () => { txUsed = true; return null; };
    await assert.rejects(() => addToCart(1, 7, MAX_QUANTITY + 1), (err) => {
      assert.equal(err.code, 'QUANTITY_LIMIT_EXCEEDED');
      assert.equal(err.statusCode, 400);
      return true;
    });
    assert.equal(txUsed, false);
  });
});
