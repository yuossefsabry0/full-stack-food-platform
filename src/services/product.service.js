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

async function listMenuFulltext({ page, limit, search }) {
  // Guarded FULLTEXT path: only when USE_FULLTEXT_SEARCH is "true". Requires
  // a FULLTEXT(name) index; without it MySQL errors and the caller falls
  // back to LIKE. Parameterized (no interpolation) to avoid injection.
  const offset = (page - 1) * limit;
  const rows = await prisma.$queryRawUnsafe(
    'SELECT `id`, `name`, `description`, `price`, `imageUrl`, `isActive` FROM `products` ' +
      'WHERE `isActive` = 1 AND MATCH(`name`) AGAINST (? IN NATURAL LANGUAGE MODE) ' +
      'ORDER BY `id` ASC LIMIT ? OFFSET ?',
    search,
    limit,
    offset
  );
  const counted = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) AS `value` FROM `products` ' +
      'WHERE `isActive` = 1 AND MATCH(`name`) AGAINST (? IN NATURAL LANGUAGE MODE)',
    search
  );
  const total = Number((counted && counted[0] && counted[0].value) || 0);
  return {
    items: rows.map(toMenuItem),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function listMenu({ page, limit, search }) {
  // Opt-in fast path with silent LIKE fallback (no behavior change by default).
  if (search && process.env.USE_FULLTEXT_SEARCH === 'true') {
    try {
      return await listMenuFulltext({ page, limit, search });
    } catch {
      // index absent or query failed: fall through to LIKE below
    }
  }
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
