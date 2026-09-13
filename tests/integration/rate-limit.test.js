'use strict';

// Low limits are set BEFORE setup so this process uses strict budgets while
// every other suite keeps generous ones.

process.env.RATE_LOGIN_MAX = '6';
process.env.RATE_LOGIN_WINDOW_MS = String(15 * 60 * 1000);
process.env.RATE_REGISTER_MAX = '6';
process.env.RATE_REGISTER_WINDOW_MS = String(60 * 60 * 1000);
process.env.TRUST_PROXY = 'true';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const { request, app, prisma } = require('../helpers');

after(() => prisma.$disconnect());

describe('rate limiting', () => {
  it('throttles login after the budget is spent', async () => {
    let last = null;
    for (let i = 0; i < 7; i += 1) {
      last = await request(app).post('/api/auth/login').set('X-Forwarded-For', '10.20.30.40').send({});
    }
    assert.equal(last.status, 429);
    assert.equal(last.body.code, 'RATE_LIMITED');
    assert.ok(last.headers['retry-after']);
  });

  it('tracks budgets per client IP (proxy-aware)', async () => {
    const other = await request(app).post('/api/auth/login').set('X-Forwarded-For', '10.20.30.41').send({});
    assert.equal(other.status, 400);
  });

  it('throttles registration independently', async () => {
    let last = null;
    for (let i = 0; i < 7; i += 1) {
      last = await request(app).post('/api/auth/register').set('X-Forwarded-For', '10.20.30.42').send({});
    }
    assert.equal(last.status, 429);
  });
});
