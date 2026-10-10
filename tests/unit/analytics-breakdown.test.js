'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const prisma = require('../../src/config/database');
const { getSalesAnalytics } = require('../../src/services/analytics.service');

const NOW = new Date('2026-05-15T12:00:00Z');

function periodItems() {
  return [
    {
      id: 1,
      productId: 10,
      productName: 'Burger',
      quantity: 2,
      lineTotal: '20.00',
      order: { id: 100, total: '70.00', deliveryFee: '50.00', createdAt: new Date('2026-05-15T10:00:00Z'), deliveredAt: new Date('2026-05-15T11:00:00Z') },
    },
    {
      id: 2,
      productId: 11,
      productName: 'Fries',
      quantity: 1,
      lineTotal: '5.00',
      order: { id: 101, total: '55.00', deliveryFee: '50.00', createdAt: new Date('2026-05-02T10:00:00Z'), deliveredAt: new Date('2026-05-03T10:00:00Z') },
    },
  ];
}

describe('analytics revenue breakdown (mocked)', () => {
  let orig;

  beforeEach(() => {
    orig = { orderItem: prisma.orderItem, product: prisma.product };
    prisma.orderItem = {
      findMany: async (args) => {
        if (args && args.select) return [];
        return periodItems();
      },
    };
    prisma.product = { findMany: async () => [] };
  });

  afterEach(() => {
    prisma.orderItem = orig.orderItem;
    prisma.product = orig.product;
  });

  it('splits totals into productRevenue + deliveryFees per period', async () => {
    const out = await getSalesAnalytics(NOW, 'created');
    assert.equal(out.sales.today, 70);
    assert.equal(out.productRevenue.today, 20);
    assert.equal(out.deliveryFees.today, 50);
    assert.equal(out.productRevenue.today + out.deliveryFees.today, out.sales.today);
    assert.equal(out.productRevenue.month + out.deliveryFees.month, out.sales.month);
    assert.equal(out.productRevenue.year + out.deliveryFees.year, out.sales.year);
    assert.equal(out.unitsSold.today, 2);
  });

  it('defaults to the created basis with identical results', async () => {
    const explicit = await getSalesAnalytics(NOW, 'created');
    const implicit = await getSalesAnalytics(NOW);
    assert.deepEqual(implicit.sales, explicit.sales);
    assert.deepEqual(implicit.unitsSold, explicit.unitsSold);
    assert.deepEqual(implicit.productRevenue, explicit.productRevenue);
    assert.deepEqual(implicit.deliveryFees, explicit.deliveryFees);
  });

  it('buckets by deliveredAt for dateBasis=delivered', async () => {
    const out = await getSalesAnalytics(NOW, 'delivered');
    assert.equal(out.unitsSold.today, 2);
    assert.equal(out.productRevenue.today + out.deliveryFees.today, out.sales.today);
  });
});
