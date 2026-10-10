'use strict';

// Task 01 regression coverage (issues 1, 7, 8, 11):
// - optionalAuth enforces server-side revocation like requireAuth
// - password reset revokes ALL tokens (new helper preserved alongside legacy)
// - new-password policy requires letter + number
// - login rate-limit key isolates per account (IP + username)

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const prisma = require('../../src/config/database');
const { optionalAuth } = require('../../src/middlewares/optionalAuth.middleware');
const { signAccessToken } = require('../../src/services/token.service');
const authService = require('../../src/services/auth.service');
const {
  registerSchema,
  resetPasswordSchema,
  newPasswordSchema,
} = require('../../src/validations/auth.validation');
const { createStaffSchema } = require('../../src/validations/admin.validation');
const { loginKey } = require('../../src/middlewares/rateLimit.middleware');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

describe('optionalAuth revocation (issue 1)', () => {
  let origAuthToken;
  let origUser;

  beforeEach(() => {
    origAuthToken = prisma.authToken;
    origUser = prisma.user;
  });

  afterEach(() => {
    prisma.authToken = origAuthToken;
    prisma.user = origUser;
  });

  async function runOptionalAuth(token, tokenRow) {
    prisma.authToken = { findUnique: async () => tokenRow };
    prisma.user = { findUnique: async () => ({ id: 1, isActive: true, name: 'T' }) };
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nexted = false;
    await optionalAuth(req, res, () => { nexted = true; });
    return { req, res, nexted };
  }

  it('rejects a revoked access token instead of treating it as authenticated', async () => {
    const token = signAccessToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    const { nexted, res } = await runOptionalAuth(token, {
      userId: 1, type: 'ACCESS', revokedAt: new Date(),
    });
    assert.equal(nexted, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('rejects when the server-side token row is missing', async () => {
    const token = signAccessToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    const { nexted, res } = await runOptionalAuth(token, null);
    assert.equal(nexted, false);
    assert.equal(res.statusCode, 401);
  });

  it('passes guest requests without a token', async () => {
    prisma.authToken = { findUnique: async () => { throw new Error('must not query'); } };
    prisma.user = { findUnique: async () => { throw new Error('must not query'); } };
    const req = { headers: {} };
    const res = mockRes();
    let nexted = false;
    await optionalAuth(req, res, () => { nexted = true; });
    assert.equal(nexted, true);
    assert.equal(req.user, null);
  });
});

describe('password-reset revokes all tokens (issue 7)', () => {
  it('exposes revokeAllTokensForUser alongside the legacy refresh-only helper', () => {
    assert.equal(typeof authService.revokeAllTokensForUser, 'function');
    assert.equal(typeof authService.revokeRefreshTokensForUser, 'function');
  });
});

describe('new-password policy (issue 8)', () => {
  it('requires at least one letter and one number', () => {
    assert.ok(newPasswordSchema.safeParse('Secret123!').success);
    assert.ok(!newPasswordSchema.safeParse('password').success);
    assert.ok(!newPasswordSchema.safeParse('12345678').success);
    assert.ok(!newPasswordSchema.safeParse('short1').success);
  });

  it('register/reset/staff creation reject letter-only passwords', () => {
    const good = { name: 'Ted', username: 'ted_1', email: 'ted@x.com', password: 'Secret123!' };
    assert.ok(registerSchema.safeParse(good).success);
    assert.ok(!registerSchema.safeParse({ ...good, password: 'password' }).success);
    const reset = {
      email: 'a@b.co', resetToken: 't', password: 'password', confirmPassword: 'password',
    };
    assert.ok(!resetPasswordSchema.safeParse(reset).success);
    const staff = {
      name: 'Ab', username: 'ab_1', email: 'ab@x.co', password: 'password', role: 'CHEF',
    };
    assert.ok(!createStaffSchema.safeParse(staff).success);
  });
});

describe('login rate-limit key (issue 11)', () => {
  it('isolates buckets per username behind the same IP', () => {
    const key = loginKey('login');
    const a = key({ ip: '1.1.1.1', body: { username: 'alice' } });
    const b = key({ ip: '1.1.1.1', body: { username: 'bob' } });
    const c = key({ ip: '1.1.1.1', body: { username: ' ALICE ' } });
    assert.notEqual(a, b);
    assert.equal(a, c);
  });
});
