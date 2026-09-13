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
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

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
    new winston.transports.File({ filename: LOG_FILE }),
    // Console carries errors only, so routine traffic stays in the file.
    new winston.transports.Console({ level: 'error' }),
  ],
});

function logRequest({ method, route, statusCode, durationMs }) {
  logger.info('request', { method, route, statusCode, durationMs });
}

function logError({ method, route, statusCode, code, message }) {
  logger.error(
    'error',
    sanitize({ method, route, statusCode, code, message: message || 'Internal server error' })
  );
}

module.exports = { logger, sanitize, logRequest, logError, LOG_FILE };
