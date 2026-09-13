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

async function getSalesAnalytics(now) {
  const reference = now instanceof Date ? now : new Date();
  const { startOfDay, startOfMonth, startOfYear } = periodBounds(reference);

  // Delivered items since the year start, with their order totals + dates.
  const items = await prisma.orderItem.findMany({
    where: { order: { status: 'DELIVERED', createdAt: { gte: startOfYear } } },
    include: { order: { select: { id: true, total: true, createdAt: true } } },
  });

  const unitsSold = { today: 0, month: 0, year: 0 };
  const sales = { today: 0, month: 0, year: 0 };
  const countedOrders = { today: new Set(), month: new Set(), year: new Set() };

  for (const item of items) {
    const at = item.order.createdAt instanceof Date ? item.order.createdAt : new Date(item.order.createdAt);
    const qty = Number(item.quantity);
    unitsSold.year += qty;
    countedOrders.year.add(item.order.id);
    if (at >= startOfMonth) {
      unitsSold.month += qty;
      countedOrders.month.add(item.order.id);
    }
    if (at >= startOfDay) {
      unitsSold.today += qty;
      countedOrders.today.add(item.order.id);
    }
  }

  // Total sales = sum of DELIVERED order totals (each order counted once).
  const totalsByOrder = new Map();
  for (const item of items) {
    if (!totalsByOrder.has(item.order.id)) {
      totalsByOrder.set(item.order.id, Number(item.order.total));
    }
  }
  const sumFor = (ids) => {
    let sum = 0;
    for (const id of ids) sum = round2(sum + totalsByOrder.get(id));
    return sum;
  };
  sales.year = sumFor(countedOrders.year);
  sales.month = sumFor(countedOrders.month);
  sales.today = sumFor(countedOrders.today);

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

  return { unitsSold, sales, byProduct };
}

module.exports = { getSalesAnalytics, periodBounds };
