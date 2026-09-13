'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const { ORDER_STATUS_LABELS, orderStatusLabel } = require('../../src/utils/orderStatus');

describe('order status labels', () => {
  it('maps the full lifecycle to the specified display strings', () => {
    assert.equal(orderStatusLabel('PENDING'), 'In Progress');
    assert.equal(orderStatusLabel('PREPARING'), 'Your order has been prepared by the restaurant');
    assert.equal(orderStatusLabel('READY_FOR_DELIVERY'), 'Ready for Delivery');
    assert.equal(orderStatusLabel('OUT_FOR_DELIVERY'), 'The order has gone out for delivery by the Delivery');
    assert.equal(orderStatusLabel('DELIVERED'), 'The order has been delivered');
  });

  it('covers exactly the five lifecycle values', () => {
    assert.deepEqual(Object.keys(ORDER_STATUS_LABELS).sort(), [
      'DELIVERED',
      'OUT_FOR_DELIVERY',
      'PENDING',
      'PREPARING',
      'READY_FOR_DELIVERY',
    ]);
  });
});
