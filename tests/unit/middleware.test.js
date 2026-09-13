'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const { rateLimit, ipKey, _resetAll } = require('../../src/middlewares/rateLimit.middleware');
const { sanitize } = require('../../src/utils/logger');
const { periodBounds } = require('../../src/services/analytics.service');

function mockReqRes(ip) {
  const res = {
    headers: {},
    statusCode: null,
    body: null,
    set(k, v) { this.headers[k] = v; return this; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
  return { req: { ip, body: {}, headers: {} }, res };
}

describe('rate limiter', () => {
  it('allows up to max then answers 429 with Retry-After', () => {
    _resetAll();
    const mw = rateLimit({ windowMs: 60000, max: 3, keyGenerator: ipKey('t') });
    let passed = 0;
    for (let i = 0; i < 4; i += 1) {
      const { req, res } = mockReqRes('9.9.9.9');
      let nexted = false;
      mw(req, res, () => { nexted = true; });
      if (nexted) passed += 1;
      if (i === 3) {
        assert.equal(nexted, false);
        assert.equal(res.statusCode, 429);
        assert.equal(res.body.code, 'RATE_LIMITED');
        assert.ok(res.headers['Retry-After']);
      }
    }
    assert.equal(passed, 3);
  });

  it('isolates buckets per key', () => {
    _resetAll();
    const mw = rateLimit({ windowMs: 60000, max: 1, keyGenerator: ipKey('t') });
    const a = mockReqRes('1.1.1.1');
    let na = false;
    mw(a.req, a.res, () => { na = true; });
    const b = mockReqRes('2.2.2.2');
    let nb = false;
    mw(b.req, b.res, () => { nb = true; });
    assert.equal(na, true);
    assert.equal(nb, true);
  });
});

describe('log sanitizer', () => {
  it('redacts sensitive keys and truncates huge strings', () => {
    const out = sanitize({
      username: 'ted',
      password: 'Secret123!',
      refreshToken: 'abc',
      nested: { otp: '123456', ok: 1 },
      big: 'x'.repeat(3000),
    });
    assert.equal(out.username, 'ted');
    assert.equal(out.password, '[REDACTED]');
    assert.equal(out.refreshToken, '[REDACTED]');
    assert.equal(out.nested.otp, '[REDACTED]');
    assert.equal(out.nested.ok, 1);
    assert.ok(out.big.endsWith('[truncated]'));
  });
});

describe('analytics period bounds', () => {
  it('computes UTC day/month/year starts', () => {
    const { startOfDay, startOfMonth, startOfYear } = periodBounds(new Date('2026-05-15T12:34:56Z'));
    assert.equal(startOfDay.toISOString(), '2026-05-15T00:00:00.000Z');
    assert.equal(startOfMonth.toISOString(), '2026-05-01T00:00:00.000Z');
    assert.equal(startOfYear.toISOString(), '2026-01-01T00:00:00.000Z');
  });
});
