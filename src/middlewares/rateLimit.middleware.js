'use strict';

const crypto = require('crypto');


const buckets = new Map();

function cleanupExpiredBuckets(now) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetTime <= now) buckets.delete(key);
  }
}

function rateLimit({ windowMs, max, keyGenerator, message = 'Too many requests', code = 'RATE_LIMITED' }) {
  return (req, res, next) => {
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
      res.set('Retry-After', String(retryAfterSec));
      const { error } = require('../utils/response');
      return error(res, {
        message,
        code,
        statusCode: 429,
      });
    }
    return next();
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

module.exports = { rateLimit, emailKey, ipKey };

// For testing / future extension.
module.exports._buckets = buckets;
module.exports._resetAll = () => buckets.clear();
