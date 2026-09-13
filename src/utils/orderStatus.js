'use strict';

// maps the formal DB OrderStatus enum values to API display labels.
// The database stores ONLY the enum values (never these strings).

const ORDER_STATUS_LABELS = {
  PENDING: 'In Progress',
  PREPARING: 'Your order has been prepared by the restaurant',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  OUT_FOR_DELIVERY: 'The order has gone out for delivery by the Delivery',
  DELIVERED: 'The order has been delivered',
};

function orderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || status;
}

module.exports = { ORDER_STATUS_LABELS, orderStatusLabel };
