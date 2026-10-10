'use strict';

const crypto = require('crypto');


const buckets = new Map();

function cleanupExpiredBuckets(now) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetTime <= now) buckets.delete(key);
  }
}

// Regular cleanup of expired buckets (the existing probabilistic cleanup
// inside the middleware stays as is). unref() so the timer never keeps the
// process alive.
const cleanupTimer = setInterval(() => cleanupExpiredBuckets(Date.now()), 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

// Optional Redis-backed store: used only when REDIS_URL is set. No Redis
// connection is opened at import time (or at all) when REDIS_URL is unset,
// in which case behavior stays exactly the in-memory limiter below.
let redisClient = null;
let redisUnavailable = false;
let redisRetryAfter = 0;
const REDIS_RETRY_MS = 30 * 1000;

function noteRedisFailure() {
  // Time-bounded fallback: a transient blip degrades to in-memory for 30s,
  // then the next request re-probes Redis instead of staying degraded until
  // restart.
  redisUnavailable = true;
  redisRetryAfter = Date.now() + REDIS_RETRY_MS;
}

function getRedisClient() {
  if (redisUnavailable) {
    if (Date.now() < redisRetryAfter) return null;
    redisUnavailable = false;
    redisRetryAfter = 0;
  }
  if (redisClient) return redisClient;
  // Read live so toggling REDIS_URL takes effect without a restart in
  // tests; env.redisUrl (src/config/env.js) mirrors the same variable.
  const redisUrl = process.env.REDIS_URL || '';
  if (!redisUrl) return null;
  try {
    // Lazy require: the Redis client package is loaded only when REDIS_URL
    // is set. The single client is reused for every request.
    const Redis = require('ioredis');
    const client = new Redis(redisUrl, { maxRetriesPerRequest: 2 });
    client.on('error', (err) => {
      // Runtime failure: fall back to the in-memory store and keep serving
      // requests. The client keeps its normal reconnect behavior in the
      // background; requests re-probe after REDIS_RETRY_MS.
      noteRedisFailure();
      // eslint-disable-next-line no-console
      console.error('Rate limiter Redis error, falling back to in-memory store:', err && err.message);
    });
    redisClient = client;
    return redisClient;
  } catch (err) {
    noteRedisFailure();
    // eslint-disable-next-line no-console
    console.error('Rate limiter Redis init failed, using in-memory store:', err && err.message);
    return null;
  }
}

// Atomic fixed-window increment in Redis with the same semantics as the
// in-memory buckets. Resolves to { allowed, retryAfterSec }.
function redisCheck(client, key, windowMs, max) {
  const script =
    "local count = redis.call('INCR', KEYS[1]) " +
    "local ttl = redis.call('PTTL', KEYS[1]) " +
    'if count == 1 then redis.call(\'PEXPIRE\', KEYS[1], ARGV[1]) ttl = tonumber(ARGV[1]) end ' +
    'return {count, ttl}';
  return client.eval(script, 1, key, String(windowMs), String(max)).then((result) => {
    const count = Number(result[0]);
    const ttlMs = Number(result[1]);
    if (count > max) {
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(ttlMs / 1000)) };
    }
    return { allowed: true, retryAfterSec: 0 };
  });
}

function tooMany(req, res, retryAfterSec, message, code) {
  res.set('Retry-After', String(retryAfterSec));
  const { error } = require('../utils/response');
  try {
    const { logWarn } = require('../utils/logger');
    logWarn({
      method: req.method,
      route: req.path,
      statusCode: 429,
      code,
      message,
    });
  } catch {
    // logging must never break rate-limit responses
  }
  return error(res, {
    message,
    code,
    statusCode: 429,
  });
}

function memoryCheck({ windowMs, max, keyGenerator, message, code }, req, res, next) {
  const now = Date.now();
  if (buckets.size > 5000 && Math.random() < 0.01) cleanupExpiredBuckets(now);

  const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetTime <= now) {
    bucket = { count: 0, resetTime: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  if (bucket.count > max) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetTime - now) / 1000));
    return tooMany(req, res, retryAfterSec, message, code);
  }
  return next();
}

function rateLimit({ windowMs, max, keyGenerator, message = 'Too many requests', code = 'RATE_LIMITED' }) {
  const options = { windowMs, max, keyGenerator, message, code };
  return (req, res, next) => {
    const client = getRedisClient();
    if (!client) {
      return memoryCheck(options, req, res, next);
    }
    const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
    return redisCheck(client, key, windowMs, max).then(
      ({ allowed, retryAfterSec }) => {
        if (!allowed) {
          return tooMany(req, res, retryAfterSec, message, code);
        }
        return next();
      },
      (err) => {
        // Runtime Redis failure: fall back to the in-memory store, never
        // crash or block the request. Re-probe after REDIS_RETRY_MS.
        noteRedisFailure();
        // eslint-disable-next-line no-console
        console.error('Rate limiter Redis command failed, falling back to in-memory store:', err && err.message);
        return memoryCheck(options, req, res, next);
      }
    );
  };
}

function emailKey(prefix) {
  return (req) => {
    const email =
      req.body && typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${prefix}:${req.ip || 'unknown'}:${email}`;
  };
}

function ipKey(prefix) {
  return (req) => `${prefix}:${req.ip || 'unknown'}`;
}

// Per-account login key: IP + username. Keeps the existing per-IP budget
// shape while also isolating targeted guessing against one username from
// unrelated logins behind the same NAT/proxy IP.
function loginKey(prefix) {
  return (req) => {
    const username =
      req.body && typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    return `${prefix}:${req.ip || 'unknown'}:${username}`;
  };
}

module.exports = { rateLimit, emailKey, ipKey, loginKey };

// For testing / future extension.
module.exports._buckets = buckets;
module.exports._resetAll = () => buckets.clear();
module.exports._resetRedisForTests = () => {
  if (redisClient && typeof redisClient.disconnect === 'function') {
    try { redisClient.disconnect(); } catch (e) { /* ignore */ }
  }
  redisClient = null;
  redisUnavailable = false;
  redisRetryAfter = 0;
};
