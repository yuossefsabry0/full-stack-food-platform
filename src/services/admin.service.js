'use strict';

const prisma = require('../config/database');
const { hashPassword } = require('../utils/password');
const { allocatePublicId } = require('./publicId.service');
const { toOrderShape } = require('./order.service');

// Admin Dashboard: user management, product management, order
// management, CHEF / DELIVERY management.
//
// Historical-data protection rules enforced here:
// - No hard deletes anywhere (users, staff, products). Deactivation uses
//   isActive; products use isActive. OrderItem snapshots live in their own
//   table, so product/user edits never touch historical orders.
// - Passwords (hashed or not) are never returned.

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function fail(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

// Users (customers): internal id (needed for admin order filters/staff
// edits) + name + username + public code + email. Additive only: existing
// keys are unchanged.

function toCustomerShape(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    userCode: user.publicId,
    email: user.email,
  };
}

async function listUsers({ page, limit, role }) {
  const where = role ? { role } : {};
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, name: true, username: true, publicId: true, email: true },
      orderBy: { id: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    items: rows.map(toCustomerShape),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Products: view (all) / add / edit / activate / deactivate 

function toAdminProductShape(product) {
  return {
    id: product.id,
    sku: product.sku || null,
    name: product.name,
    description: product.description || null,
    price: Number(product.price),
    image: product.imageUrl || null,
    imageUrl: product.imageUrl || null,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function productWhere({ search, isActive }) {
  const where = {};
  if (isActive !== undefined) where.isActive = isActive;
  if (search) where.name = { contains: search };
  return where;
}

async function listProducts({ page, limit, search, isActive }) {
  const where = productWhere({ search, isActive });
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
    items: rows.map(toAdminProductShape),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function createProduct({ name, description, price, imageUrl, isActive }) {
  const product = await prisma.product.create({
    data: {
      name,
      description: description ?? null,
      price: round2(price),
      imageUrl: imageUrl ?? null,
      isActive: isActive ?? true,
    },
  });
  return toAdminProductShape(product);
}

async function updateProduct(productId, changes) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw fail(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  const data = {};
  if (changes.name !== undefined) data.name = changes.name;
  if (changes.description !== undefined) data.description = changes.description;
  if (changes.price !== undefined) data.price = round2(changes.price);
  if (changes.imageUrl !== undefined) data.imageUrl = changes.imageUrl;
  if (changes.isActive !== undefined) data.isActive = changes.isActive;
  const updated = await prisma.product.update({ where: { id: productId }, data });
  return toAdminProductShape(updated);
}

// Orders: all current orders + filters + pagination + sorting 

function toAdminOrderShape(order, items) {
  return {
    ...toOrderShape(order, items),
    chefId: order.chefId || null,
    preparedAt: order.preparedAt || null,
    deliveryId: order.deliveryId || null,
    acceptedAt: order.acceptedAt || null,
    deliveredAt: order.deliveredAt || null,
  };
}

function ordersWhere({ status, orderId, userId, deliveryId, chefId, dateFrom, dateTo }) {
  const where = {};
  if (status) where.status = status;
  if (orderId) where.id = orderId;
  if (userId) where.userId = userId;
  if (deliveryId) where.deliveryId = deliveryId;
  if (chefId) where.chefId = chefId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }
  return where;
}

async function listOrders({ page, limit, status, orderId, userId, deliveryId, chefId, dateFrom, dateTo, sortBy, sortOrder }) {
  const where = ordersWhere({ status, orderId, userId, deliveryId, chefId, dateFrom, dateTo });
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: { orderBy: { id: 'asc' } } },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    items: rows.map((order) => toAdminOrderShape(order, order.items)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

//  CHEF / DELIVERY staff: create / view / edit / activate / deactivate 

function toStaffShape(user) {
  return {
    id: user.id,
    userCode: user.publicId,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

async function listStaff({ page, limit, role }) {
  const where = role ? { role } : { role: { in: ['CHEF', 'DELIVERY'] } };
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, publicId: true, name: true, username: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { id: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    items: rows.map(toStaffShape),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function createStaff({ name, username, email, password, role }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true, email: true },
  });
  if (existing) {
    throw fail(
      409,
      'ACCOUNT_EXISTS',
      existing.username === username ? 'Username is already taken' : 'Email is already registered'
    );
  }
  const passwordHash = await hashPassword(password);
  // Same storage as every account (public code allocated, ADMIN never allowed
  // here — the role enum in validation restricts to CHEF / DELIVERY).
  const user = await prisma.$transaction(async (tx) => {
    const publicId = await allocatePublicId(tx);
    return tx.user.create({
      data: { publicId, name, username, email, passwordHash, role },
    });
  });
  return toStaffShape(user);
}

async function updateStaff(adminUserId, staffId, changes) {
  const target = await prisma.user.findUnique({ where: { id: staffId } });
  if (!target) {
    throw fail(404, 'STAFF_NOT_FOUND', 'Staff account not found');
  }
  // Self-deactivation guard is reachable: an admin editing their own ADMIN
  // row with isActive false gets a 400 (not the staff 404). Other ADMIN rows
  // remain untouchable here (404, same as before).
  if (target.role === 'ADMIN') {
    if (staffId === adminUserId && changes.isActive === false) {
      throw fail(400, 'CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own admin account');
    }
    throw fail(404, 'STAFF_NOT_FOUND', 'Staff account not found');
  }
  if (target.role !== 'CHEF' && target.role !== 'DELIVERY') {
    throw fail(404, 'STAFF_NOT_FOUND', 'Staff account not found');
  }
  const duplicateOr = [];
  if (changes.username) duplicateOr.push({ username: changes.username });
  if (changes.email) duplicateOr.push({ email: changes.email });
  if (duplicateOr.length > 0) {
    const clash = await prisma.user.findFirst({
      where: {
        AND: [{ id: { not: staffId } }, { OR: duplicateOr }],
      },
      select: { username: true, email: true },
    });
    if (clash) {
      throw fail(
        409,
        'ACCOUNT_EXISTS',
        clash.username === changes.username ? 'Username is already taken' : 'Email is already registered'
      );
    }
  }
  const data = {};
  if (changes.name !== undefined) data.name = changes.name;
  if (changes.username !== undefined) data.username = changes.username;
  if (changes.email !== undefined) data.email = changes.email;
  if (changes.isActive !== undefined) data.isActive = changes.isActive;
  const updated = await prisma.user.update({ where: { id: staffId }, data });
  return toStaffShape(updated);
}

module.exports = {
  listUsers,
  listProducts,
  createProduct,
  updateProduct,
  listOrders,
  listStaff,
  createStaff,
  updateStaff,
};
