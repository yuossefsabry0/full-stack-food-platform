'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const { toDeliveryHistoryShape } = require('../../src/services/delivery.service');

const ORDER = {
  id: 3,
  status: 'DELIVERED',
  recipientName: 'Ted',
  address: 'Flat 5',
  buildingNumber: '12',
  apartmentNumber: '5',
  streetName: 'Main St',
  phoneNumber: '+1000000',
  total: '70.00',
  deliveryId: 9,
  createdAt: new Date('2026-05-14T10:00:00Z'),
  deliveredAt: new Date('2026-05-14T12:00:00Z'),
};

const ITEMS = [
  { productName: 'Burger', quantity: 2, unitPrice: '10.00', lineTotal: '20.00' },
];

describe('toDeliveryHistoryShape (mocked, no database)', () => {
  it('keeps existing fields exactly and adds address, prices, createdAt', () => {
    const out = toDeliveryHistoryShape(ORDER, ITEMS);
    assert.equal(out.id, 3);
    assert.equal(out.status, 'DELIVERED');
    assert.equal(out.customerName, 'Ted');
    assert.equal(out.itemCount, 2);
    assert.equal(out.total, 70);
    assert.equal(out.deliveryId, 9);
    assert.deepEqual(out.address, {
      name: 'Ted',
      address: 'Flat 5',
      buildingNumber: '12',
      apartmentNumber: '5',
      streetName: 'Main St',
      phoneNumber: '+1000000',
    });
    assert.deepEqual(out.products, [
      { productName: 'Burger', quantity: 2, unitPrice: 10, subtotal: 20 },
    ]);
    assert.deepEqual(out.createdAt, new Date('2026-05-14T10:00:00Z'));
    assert.deepEqual(out.deliveredAt, new Date('2026-05-14T12:00:00Z'));
  });
});
