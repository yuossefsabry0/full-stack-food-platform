'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const prisma = require('../../src/config/database');
const { requireAuth } = require('../../src/middlewares/auth.middleware');
const { signAccessToken, sha256Hex } = require('../../src/services/token.service');
const authService = require('../../src/services/auth.service');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

describe('requireAuth access-token revocation', () => {
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

  async function runMiddleware(token, tokenRow) {
    prisma.authToken = {
      findUnique: async () => tokenRow,
    };
    prisma.user = {
      findUnique: async () => ({ id: 1, isActive: true }),
    };
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nexted = false;
    await requireAuth(req, res, () => { nexted = true; });
    return { req, res, nexted };
  }

  it('passes with a valid non-revoked token row', async () => {
    const token = signAccessToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    void sha256Hex;
    const { nexted } = await runMiddleware(token, {
      userId: 1, type: 'ACCESS', revokedAt: null,
    });
    assert.equal(nexted, true);
  });

  it('rejects when the token row is missing', async () => {
    const token = signAccessToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    const { nexted, res } = await runMiddleware(token, null);
    assert.equal(nexted, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('rejects when the token row is revoked', async () => {
    const token = signAccessToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    const { nexted, res } = await runMiddleware(token, {
      userId: 1, type: 'ACCESS', revokedAt: new Date(),
    });
    assert.equal(nexted, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });
});

describe('logoutUser', () => {
  let origAuthToken;

  beforeEach(() => {
    origAuthToken = prisma.authToken;
  });

  afterEach(() => {
    prisma.authToken = origAuthToken;
  });

  it('revokes the presented access token and the same-user refresh token', async () => {
    const calls = { updateMany: [], update: [], findUnique: null };
    prisma.authToken = {
      updateMany: async (args) => { calls.updateMany.push(args); return { count: 1 }; },
      findUnique: async () => ({ id: 9, userId: 1, type: 'REFRESH', revokedAt: null }),
      update: async (args) => { calls.update.push(args); return {}; },
    };
    await authService.logoutUser({ userId: 1, accessToken: 'a', refreshToken: 'r' });
    assert.equal(calls.updateMany.length, 1);
    assert.equal(calls.update.length, 1);
  });

  it('revokes all sessions with allSessions: true', async () => {
    let seen = null;
    prisma.authToken = {
      updateMany: async (args) => { seen = args; return { count: 3 }; },
      findUnique: async () => { throw new Error('should not be called'); },
      update: async () => { throw new Error('should not be called'); },
    };
    const out = await authService.logoutUser({ userId: 1, accessToken: 'a', allSessions: true });
    assert.deepEqual(seen.where, { userId: 1, revokedAt: null });
    assert.equal(out.revokedSessions, 3);
  });
});
