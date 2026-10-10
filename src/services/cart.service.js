'use strict';

const prisma = require('../config/database');
const env = require('../config/env');
const { MAX_QUANTITY } = require('../validations/cart.validation');

function toCartShape(cart, items) {
  const shaped = items.map((item) => {
    const price = Number(item.product.price);
    return {
      productId: item.productId,
      name: item.product.name,
      price,
      image: item.product.imageUrl || null,
      quantity: item.quantity,
      lineTotal: Math.round(price * item.quantity * 100) / 100,
    };
  });
  const total = Math.round(shaped.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;
  // Cart Totals: productsTotal = Σ(price × quantity),
  // deliveryFee comes from environment configuration (never hard-coded),
  // totalAmount = productsTotal + deliveryFee. `total` is kept as the
  // products total for backward compatibility.
  const deliveryFee = shaped.length === 0 ? 0 : env.deliveryFee;
  const totalAmount = Math.round((total + deliveryFee) * 100) / 100;
  return {
    id: cart ? cart.id : null,
    items: shaped,
    count: shaped.reduce((sum, i) => sum + i.quantity, 0),
    total,
    productsTotal: total,
    deliveryFee,
    totalAmount,
  };
}

async function fetchCartItems(cartId) {
  return prisma.cartItem.findMany({
    where: { cartId },
    include: { product: true },
    orderBy: { id: 'asc' },
  });
}

async function getCart(userId) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return toCartShape(null, []);
  const items = await fetchCartItems(cart.id);
  return toCartShape(cart, items);
}

async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }
  return cart;
}

async function findAvailableProduct(productId) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) {
    const err = new Error('Product is not available');
    err.statusCode = 404;
    err.code = 'PRODUCT_NOT_AVAILABLE';
    throw err;
  }
  return product;
}

function quantityLimitError() {
  const err = new Error(`Quantity must be at most ${MAX_QUANTITY}`);
  err.statusCode = 400;
  err.code = 'QUANTITY_LIMIT_EXCEEDED';
  return err;
}

async function addToCart(userId, productId, quantity) {
  await findAvailableProduct(productId);
  const cart = await getOrCreateCart(userId);
  if (quantity > MAX_QUANTITY) {
    throw quantityLimitError();
  }
  // One row per (cart, product): repeat adds increase the quantity.
  // Atomic conditional increment: the row only changes when
  // quantity + increment <= MAX_QUANTITY.
  const conditionalIncrement = (tx) =>
    tx.cartItem.updateMany({
      where: { cartId: cart.id, productId, quantity: { lte: MAX_QUANTITY - quantity } },
      data: { quantity: { increment: quantity } },
    });
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId } },
      });
      if (existing) {
        const updated = await conditionalIncrement(tx);
        if (updated.count === 0) {
          throw quantityLimitError();
        }
      } else {
        await tx.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
      }
    });
  } catch (err) {
    if (err && err.statusCode) {
      throw err;
    }
    // Unique-constraint race: the line was created concurrently after our
    // read. Retry the conditional update exactly once in a NEW transaction.
    if (err && err.code === 'P2002') {
      await prisma.$transaction(async (tx) => {
        const updated = await conditionalIncrement(tx);
        if (updated.count === 0) {
          throw quantityLimitError();
        }
      });
    } else {
      throw err;
    }
  }
  const items = await fetchCartItems(cart.id);
  return toCartShape(cart, items);
}

async function findOwnCartItem(userId, productId) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    const err = new Error('Product is not in the cart');
    err.statusCode = 404;
    err.code = 'CART_ITEM_NOT_FOUND';
    throw err;
  }
  const item = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  if (!item) {
    const err = new Error('Product is not in the cart');
    err.statusCode = 404;
    err.code = 'CART_ITEM_NOT_FOUND';
    throw err;
  }
  return { cart, item };
}

async function updateCartItem(userId, productId, change) {
  const { cart, item } = await findOwnCartItem(userId, productId);
  if (change.quantity !== undefined) {
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: change.quantity } });
  } else if (change.action === 'increase') {
    if (item.quantity + 1 > MAX_QUANTITY) {
      const err = new Error(`Quantity must be at most ${MAX_QUANTITY}`);
      err.statusCode = 400;
      err.code = 'QUANTITY_LIMIT_EXCEEDED';
      throw err;
    }
    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: { increment: 1 } },
    });
  } else {
    // decrease: step down, removing the item when it would reach zero.
    if (item.quantity <= 1) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: { decrement: 1 } },
      });
    }
  }
  const items = await fetchCartItems(cart.id);
  return toCartShape(cart, items);
}

async function removeFromCart(userId, productId) {
  const { cart, item } = await findOwnCartItem(userId, productId);
  await prisma.cartItem.delete({ where: { id: item.id } });
  const items = await fetchCartItems(cart.id);
  return toCartShape(cart, items);
}

module.exports = { getCart, addToCart, updateCartItem, removeFromCart };
