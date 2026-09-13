'use strict';

const prisma = require('../config/database');

// Product system (Menu, Product Details, Search, Pagination).
//
// - The Menu lists only active products (isActive = true). Deactivation never
//   deletes rows, so historical Orders stay valid (OrderItem keeps its own
//   productName/unitPrice snapshot and a SetNull product link).
// - Search is a partial name match. On MySQL, `contains` compiles to LIKE and
//   is case-insensitive under the usual case-insensitive collations
//   (e.g. utf8mb4_unicode_ci), so even 2-3 letters match.

function toMenuItem(product) {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    image: product.imageUrl || null,
    description: product.description || null,
    detailsUrl: `/api/products/${product.id}`,
  };
}

function toProductDetails(product) {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    image: product.imageUrl || null,
    description: product.description || null,
    isActive: product.isActive,
    addToCart: { method: 'POST', href: '/api/cart/items', label: 'Add to Cart' },
  };
}

async function listMenu({ page, limit, search }) {
  const where = { isActive: true };
  if (search) {
    where.name = { contains: search };
  }
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    items: rows.map(toMenuItem),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getProductDetails(productId) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) {
    const err = new Error('Product not available');
    err.statusCode = 404;
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }
  return toProductDetails(product);
}

module.exports = { listMenu, getProductDetails };
