'use strict';

const prisma = require('../config/database');

// Product Sales Statistics + Total Sales.
//
// - Calculated ONLY from Order Items belonging to completed (DELIVERED)
//   orders. Cart items are never sales. Undelivered orders never count.
// - Per-product units come from the OrderItem snapshots (productName /
//   quantity stored at checkout), so later product edits, renames, or
//   deactivations cannot rewrite sales history.
// - Period boundaries use UTC day / month / year.

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function periodBounds(now) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  return {
    startOfDay: new Date(Date.UTC(y, m, d)),
    startOfMonth: new Date(Date.UTC(y, m, 1)),
    startOfYear: new Date(Date.UTC(y, 0, 1)),
  };
}

async function getSalesAnalytics(now, dateBasis) {
  const reference = now instanceof Date ? now : new Date();
  // Date basis for the period buckets: 'created' (default, unchanged
  // behavior) or 'delivered'. Status filtering stays DELIVERED-only either
  // way; only the bucketing date changes.
  const basis = dateBasis === 'delivered' ? 'delivered' : 'created';
  const dateField = basis === 'delivered' ? 'deliveredAt' : 'createdAt';
  const { startOfDay, startOfMonth, startOfYear } = periodBounds(reference);

  // Delivered items since the year start, with their order totals + dates.
  const items = await prisma.orderItem.findMany({
    where: { order: { status: 'DELIVERED', [dateField]: { gte: startOfYear } } },
    include: { order: { select: { id: true, total: true, deliveryFee: true, createdAt: true, deliveredAt: true } } },
  });

  const unitsSold = { today: 0, month: 0, year: 0 };
  const sales = { today: 0, month: 0, year: 0 };
  const productRevenue = { today: 0, month: 0, year: 0 };
  const countedOrders = { today: new Set(), month: new Set(), year: new Set() };

  for (const item of items) {
    // Records with a null bucketing date cannot be placed in a date bucket
    // (only possible for dateBasis=delivered) and are excluded from the
    // date-bucket calculation.
    const rawDate = item.order[dateField];
    if (rawDate === null || rawDate === undefined) continue;
    const at = rawDate instanceof Date ? rawDate : new Date(rawDate);
    const qty = Number(item.quantity);
    const lineTotal = Number(item.lineTotal);
    unitsSold.year += qty;
    productRevenue.year = round2(productRevenue.year + lineTotal);
    countedOrders.year.add(item.order.id);
    if (at >= startOfMonth) {
      unitsSold.month += qty;
      productRevenue.month = round2(productRevenue.month + lineTotal);
      countedOrders.month.add(item.order.id);
    }
    if (at >= startOfDay) {
      unitsSold.today += qty;
      productRevenue.today = round2(productRevenue.today + lineTotal);
      countedOrders.today.add(item.order.id);
    }
  }

  // Total sales = sum of DELIVERED order totals (each order counted once).
  const totalsByOrder = new Map();
  const feesByOrder = new Map();
  for (const item of items) {
    if (!totalsByOrder.has(item.order.id)) {
      totalsByOrder.set(item.order.id, Number(item.order.total));
      feesByOrder.set(item.order.id, Number(item.order.deliveryFee));
    }
  }
  const sumFor = (map, ids) => {
    let sum = 0;
    for (const id of ids) sum = round2(sum + map.get(id));
    return sum;
  };
  sales.year = sumFor(totalsByOrder, countedOrders.year);
  sales.month = sumFor(totalsByOrder, countedOrders.month);
  sales.today = sumFor(totalsByOrder, countedOrders.today);
  // Delivery fees = sum of DELIVERED order delivery fees (each order once),
  // so productRevenue + deliveryFees equals the total per period.
  const deliveryFees = {
    today: sumFor(feesByOrder, countedOrders.today),
    month: sumFor(feesByOrder, countedOrders.month),
    year: sumFor(feesByOrder, countedOrders.year),
  };

  // Units sold for every product (all-time, DELIVERED only). Products with
  // no sales appear with 0; snapshot names keep history stable.
  const [products, allTimeItems] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true } }),
    prisma.orderItem.findMany({
      where: { order: { status: 'DELIVERED' } },
      select: { productId: true, productName: true, quantity: true },
    }),
  ]);
  const unitsByProduct = new Map();
  const namesByProduct = new Map();
  for (const item of allTimeItems) {
    unitsByProduct.set(item.productId, (unitsByProduct.get(item.productId) || 0) + Number(item.quantity));
    if (!namesByProduct.has(item.productId)) namesByProduct.set(item.productId, item.productName);
  }
  const byProduct = products
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      unitsSold: unitsByProduct.get(p.id) || 0,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold || a.productName.localeCompare(b.productName));
  // Snapshot rows whose product link is gone (defensive: products are never
  // hard-deleted, so this is normally empty).
  for (const [productId, units] of unitsByProduct) {
    if (productId !== null && !products.some((p) => p.id === productId)) {
      byProduct.push({ productId, productName: namesByProduct.get(productId), unitsSold: units });
    }
  }
  if (unitsByProduct.has(null)) {
    byProduct.push({ productId: null, productName: namesByProduct.get(null), unitsSold: unitsByProduct.get(null) });
  }

  return { unitsSold, sales, productRevenue, deliveryFees, byProduct };
}

module.exports = { getSalesAnalytics, periodBounds };
