'use strict';

const { logRequest } = require('../utils/logger');

// per-request operational log line: date/time (timestamp), level,
// HTTP method, route path (no query string, no body, no headers — so no
// passwords, tokens, OTPs, or sensitive data can ever land in the log),
// status code, and duration in milliseconds.
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  // Capture up front: req.url is rewritten while nested routers dispatch,
  // but originalUrl always holds the full path. Query string is dropped so
  // no query data can ever land in the log.
  const route = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
  const method = req.method;
  res.on('finish', () => {
    const durationMs = Math.round((Number(process.hrtime.bigint() - start) / 1e6) * 100) / 100;
    logRequest({ method, route, statusCode: res.statusCode, durationMs });
  });
  next();
}

module.exports = { requestLogger };
