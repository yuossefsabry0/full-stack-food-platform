'use strict';

const fs = require('fs');
const path = require('path');
const winston = require('winston');
const env = require('../config/env');

// - One JSON-lines file with date/time, level, method, route, status code,
//   duration, and error info. Entirely separate from any future Admin Log
//   History / Activity History feature (this is a file, not database data).
// - NEVER logs passwords, access/refresh tokens, OTPs, or sensitive data:
//   the request logger records only method + path (no query/body/headers),
//   and `sanitize` redacts sensitive keys from anything logged as an object.

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function resolveLogFile() {
  const configured = env.logFile || 'logs/operational.log';
  return path.isAbsolute(configured) ? configured : path.resolve(PROJECT_ROOT, configured);
}

const LOG_FILE = resolveLogFile();
try {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
} catch (err) {
  // Unwritable log path must not crash startup; winston falls back to
  // console below and the error is reported once.
  // eslint-disable-next-line no-console
  console.error(`Log directory unavailable (${LOG_FILE}):`, err && err.message);
}

const SENSITIVE_KEY = /(password|passwd|token|otp|secret|authorization|cookie)/i;

function sanitize(value, seen) {
  if (Array.isArray(value)) return value.map((v) => sanitize(v, seen));
  if (value && typeof value === 'object') {
    if (value instanceof Error) {
      return { message: value.message, code: value.code };
    }
    seen = seen || new Set();
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : sanitize(value[key], seen);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 2000) return value.slice(0, 2000) + '...[truncated]';
  return value;
}

const logger = winston.createLogger({
  level: env.logLevel,
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    // Size-based rotation without new dependencies: 5MB per file, 5 files
    // retained. Prevents unbounded growth of the operational log.
    new winston.transports.File({ filename: LOG_FILE, maxsize: 5 * 1024 * 1024, maxFiles: 5 }),
    // Console carries errors only, so routine traffic stays in the file.
    new winston.transports.Console({ level: 'error' }),
  ],
});

function logRequest({ method, route, statusCode, durationMs }) {
  logger.info('request', { method, route, statusCode, durationMs });
}

function logError({ method, route, statusCode, code, message, stack, userId }) {
  logger.error(
    'error',
    sanitize({ method, route, statusCode, code, message: message || 'Internal server error', stack, userId })
  );
}

// Warn-level 4xx observability (no bodies/headers/tokens — sanitized like
// errors). Gives brute-force/enumeration signals a queryable home without
// changing any API response.
function logWarn({ method, route, statusCode, code, message, userId }) {
  logger.warn(
    'warn',
    sanitize({ method, route, statusCode, code, message: message || 'Request rejected', userId })
  );
}

// Admin audit trail (append-only, file-based — no schema change): who did
// what to which record. Passwords/tokens are never passed here; sanitize
// still guards the detail object.
function logAudit({ actorId, action, target, detail }) {
  logger.info(
    'audit',
    sanitize({ actorId, action, target, detail })
  );
}

module.exports = { logger, sanitize, logRequest, logError, logWarn, logAudit, LOG_FILE };
