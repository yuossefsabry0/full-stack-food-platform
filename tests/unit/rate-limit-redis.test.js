'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const rateLimitModule = require('../../src/middlewares/rateLimit.middleware');

const { rateLimit, ipKey, _resetAll, _resetRedisForTests } = rateLimitModule;
const redisPath = require.resolve('ioredis');

let instances;
let evalImpl;

class FakeRedis {
  constructor(url, options) {
    instances.push({ url, options });
    this.handlers = {};
    this.store = new Map();
  }

  on(event, handler) {
    this.handlers[event] = handler;
    return this;
  }

  disconnect() {}

  eval() {
    // eslint-disable-next-line prefer-rest-params
    return evalImpl(this, ...Array.from(arguments));
  }
}

function mockIoredis() {
  instances = [];
  evalImpl = () => Promise.resolve([0, 0]);
  const original = require.cache[redisPath];
  require.cache[redisPath] = { exports: FakeRedis };
  return original;
}

function memoryEval(windowMs) {
  return function redisMemoryEval(client, script, numKeys, key) {
    void script;
    void numKeys;
    const now = Date.now();
    let entry = client.store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + Number(windowMs) };
      client.store.set(key, entry);
    } else {
      entry.count += 1;
    }
    return Promise.resolve([entry.count, Math.max(0, entry.resetAt - now)]);
  };
}

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

describe('rate limiter optional Redis store (mocked, no real server)', () => {
  let originalCached;
  let originalRedisUrl;

  beforeEach(() => {
    originalRedisUrl = process.env.REDIS_URL;
    originalCached = mockIoredis();
    _resetAll();
    _resetRedisForTests();
  });

  afterEach(() => {
    if (originalCached) {
      require.cache[redisPath] = originalCached;
    } else {
      delete require.cache[redisPath];
    }
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
    _resetAll();
    _resetRedisForTests();
  });

  it('uses one shared client and enforces the same limits through Redis', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    evalImpl = function redisEval(client, script, numKeys, key, windowMs) {
      return memoryEval(windowMs)(client, script, numKeys, key);
    };
    const mw = rateLimit({ windowMs: 60000, max: 2, keyGenerator: ipKey('rt') });
    let passed = 0;
    let limited = null;
    for (let i = 0; i < 3; i += 1) {
      const { req, res } = mockReqRes('5.6.7.8');
      let nexted = false;
      // eslint-disable-next-line no-await-in-loop
      await mw(req, res, () => { nexted = true; });
      if (nexted) passed += 1;
      else limited = res;
    }
    assert.equal(passed, 2);
    assert.equal(limited.statusCode, 429);
    assert.equal(limited.body.code, 'RATE_LIMITED');
    assert.ok(limited.headers['Retry-After']);
    assert.equal(instances.length, 1);
    assert.equal(instances[0].url, 'redis://localhost:6379');
  });

  it('falls back to memory without blocking when Redis commands fail', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    evalImpl = () => Promise.reject(new Error('connection lost'));
    const mw = rateLimit({ windowMs: 60000, max: 5, keyGenerator: ipKey('rf') });
    const { req, res } = mockReqRes('1.2.3.4');
    let nexted = false;
    await mw(req, res, () => { nexted = true; });
    assert.equal(nexted, true);
    // After the failure, later requests keep flowing through the fallback.
    const second = mockReqRes('1.2.3.4');
    let nexted2 = false;
    await mw(second.req, second.res, () => { nexted2 = true; });
    assert.equal(nexted2, true);
  });

  it('stays purely in-memory with identical behavior when REDIS_URL is unset', async () => {
    delete process.env.REDIS_URL;
    const mw = rateLimit({ windowMs: 60000, max: 1, keyGenerator: ipKey('rm') });
    const first = mockReqRes('9.8.7.6');
    let n1 = false;
    await mw(first.req, first.res, () => { n1 = true; });
    assert.equal(n1, true);
    const second = mockReqRes('9.8.7.6');
    let n2 = false;
    await mw(second.req, second.res, () => { n2 = true; });
    assert.equal(n2, false);
    assert.equal(second.res.statusCode, 429);
    assert.equal(instances.length, 0);
  });
});
