'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} = require('../../src/validations/auth.validation');
const { menuQuerySchema, productIdParamSchema } = require('../../src/validations/product.validation');
const { addToCartSchema, updateCartItemSchema, cartItemParamSchema } = require('../../src/validations/cart.validation');
const { checkoutSchema, orderIdParamSchema } = require('../../src/validations/order.validation');
const {
  adminUsersQuerySchema,
  adminProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
  adminOrdersQuerySchema,
  createStaffSchema,
  updateStaffSchema,
  adminStaffQuerySchema,
} = require('../../src/validations/admin.validation');

describe('auth validations', () => {
  it('register accepts a full account and rejects role injection', () => {
    const good = { name: 'Ted', username: 'ted_1', email: 'TED@x.com', password: 'Secret123!' };
    const parsed = registerSchema.parse(good);
    assert.equal(parsed.email, 'ted@x.com');
    assert.throws(() => registerSchema.parse({ ...good, role: 'ADMIN' }));
    assert.throws(() => registerSchema.parse({ ...good, password: 'short' }));
    assert.throws(() => registerSchema.parse({ ...good, email: 'nope' }));
  });

  it('login requires both fields', () => {
    assert.ok(loginSchema.safeParse({ username: 'ted', password: 'x' }).success);
    assert.ok(!loginSchema.safeParse({ username: 'ted' }).success);
  });

  it('refresh/forgot/otp/reset enforce their shapes', () => {
    assert.ok(refreshSchema.safeParse({ refreshToken: 'abc' }).success);
    assert.ok(!refreshSchema.safeParse({}).success);
    assert.ok(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success);
    assert.ok(!forgotPasswordSchema.safeParse({ email: 'bad' }).success);
    assert.ok(verifyOtpSchema.safeParse({ email: 'a@b.co', otp: '123456' }).success);
    assert.ok(!verifyOtpSchema.safeParse({ email: 'a@b.co', otp: '12345' }).success);
    assert.ok(!verifyOtpSchema.safeParse({ email: 'a@b.co', otp: 'abcdef' }).success);
    const reset = { email: 'a@b.co', resetToken: 't', password: 'Secret123!', confirmPassword: 'Secret123!' };
    assert.ok(resetPasswordSchema.safeParse(reset).success);
    const mismatch = resetPasswordSchema.safeParse({ ...reset, confirmPassword: 'Nope123!' });
    assert.ok(!mismatch.success);
    assert.equal(mismatch.error.issues[0].path.join('.'), 'confirmPassword');
  });
});

describe('product/cart/order validations', () => {
  it('menu query coerces pagination and accepts optional search', () => {
    const parsed = menuQuerySchema.parse({ page: '2', limit: '5', search: 'bur' });
    assert.deepEqual(parsed, { page: 2, limit: 5, search: 'bur' });
    assert.deepEqual(menuQuerySchema.parse({}), { page: 1, limit: 10 });
    assert.throws(() => menuQuerySchema.parse({ page: '0' }));
    assert.throws(() => menuQuerySchema.parse({ limit: '51' }));
    assert.ok(productIdParamSchema.safeParse({ id: '3' }).success);
    assert.ok(!productIdParamSchema.safeParse({ id: 'x' }).success);
  });

  it('cart quantity stays within 1..99', () => {
    assert.deepEqual(addToCartSchema.parse({ productId: 1 }), { productId: 1, quantity: 1 });
    assert.throws(() => addToCartSchema.parse({ productId: 1, quantity: 0 }));
    assert.throws(() => addToCartSchema.parse({ productId: 1, quantity: 100 }));
    assert.ok(updateCartItemSchema.safeParse({ quantity: 3 }).success);
    assert.ok(updateCartItemSchema.safeParse({ action: 'increase' }).success);
    assert.ok(updateCartItemSchema.safeParse({ action: 'decrease' }).success);
    assert.ok(!updateCartItemSchema.safeParse({}).success);
    assert.ok(!updateCartItemSchema.safeParse({ action: 'wipe' }).success);
    assert.ok(cartItemParamSchema.safeParse({ productId: '7' }).success);
  });

  it('checkout requires the complete delivery address', () => {
    const full = {
      name: 'Ted', address: 'Flat 5', buildingNumber: '12',
      apartmentNumber: '5', streetName: 'Main St', phoneNumber: '+1000000',
    };
    assert.ok(checkoutSchema.safeParse(full).success);
    const { phoneNumber, ...missing } = full;
    void phoneNumber;
    assert.ok(!checkoutSchema.safeParse(missing).success);
    assert.ok(!checkoutSchema.safeParse({ ...full, extra: 1 }).success);
    assert.ok(orderIdParamSchema.safeParse({ id: '9' }).success);
  });
});

describe('admin validations', () => {
  it('users/products/orders queries validate filters and pagination', () => {
    assert.deepEqual(adminUsersQuerySchema.parse({}), { page: 1, limit: 20 });
    assert.ok(!adminUsersQuerySchema.safeParse({ role: 'SUPER' }).success);
    const pq = adminProductsQuerySchema.parse({ isActive: 'false' });
    assert.equal(pq.isActive, false);
    assert.ok(createProductSchema.safeParse({ name: 'Pizza', price: 9.99 }).success);
    assert.ok(!createProductSchema.safeParse({ name: 'X', price: -1 }).success);
    assert.ok(!updateProductSchema.safeParse({}).success);
    const oq = adminOrdersQuerySchema.parse({ status: 'PENDING', sortBy: 'total', sortOrder: 'asc' });
    assert.equal(oq.sortBy, 'total');
    assert.ok(!adminOrdersQuerySchema.safeParse({ status: 'WRONG' }).success);
    assert.ok(!adminOrdersQuerySchema.safeParse({ sortBy: 'hacked' }).success);
  });

  it('staff creation allows only CHEF/DELIVERY', () => {
    const base = { name: 'Ab', username: 'ab_1', email: 'ab@x.co', password: 'Secret123!' };
    assert.ok(createStaffSchema.safeParse({ ...base, role: 'CHEF' }).success);
    assert.ok(createStaffSchema.safeParse({ ...base, role: 'DELIVERY' }).success);
    assert.ok(!createStaffSchema.safeParse({ ...base, role: 'ADMIN' }).success);
    assert.ok(!createStaffSchema.safeParse({ ...base, role: 'BASIC' }).success);
    assert.ok(updateStaffSchema.safeParse({ isActive: false }).success);
    assert.ok(!updateStaffSchema.safeParse({ role: 'CHEF' }).success);
    assert.ok(adminStaffQuerySchema.safeParse({ role: 'CHEF' }).success);
    assert.ok(!adminStaffQuerySchema.safeParse({ role: 'ADMIN' }).success);
  });
});
