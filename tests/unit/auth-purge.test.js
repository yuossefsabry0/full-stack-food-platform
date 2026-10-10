'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const prisma = require('../../src/config/database');
const { purgeExpiredAuthTokens } = require('../../src/services/auth.service');

describe('purgeExpiredAuthTokens', () => {
  let origAuthToken;

  beforeEach(() => {
    origAuthToken = prisma.authToken;
  });

  afterEach(() => {
    prisma.authToken = origAuthToken;
  });

  it('deletes only rows whose expiresAt is older than the 7-day grace period', async () => {
    let seen = null;
    prisma.authToken = {
      deleteMany: async (args) => { seen = args; return { count: 2 }; },
    };
    const before = Date.now();
    const out = await purgeExpiredAuthTokens();
    assert.equal(out.deleted, 2);
    const cutoff = seen.where.expiresAt.lt.getTime();
    const sevenDaysMs = 7 * 24 * 3600 * 1000;
    assert.ok(Math.abs((before - sevenDaysMs) - cutoff) < 60 * 1000);
    assert.ok(!('revokedAt' in (seen.where || {})));
  });
});
