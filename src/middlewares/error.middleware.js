'use strict';

const { error } = require('../utils/response');
const { logError, logWarn } = require('../utils/logger');

// Request context for 500 logs only: method + path (never the query
// string), the user id when req.user exists. The project has no request
// id, so none is included. Bodies, headers, tokens, OTPs and passwords are
// never attached — only the sanitized stack trace plus this context.
function errorContext(req, err) {
  return {
    method: req.method,
    route: req.path,
    userId: req.user ? req.user.id : undefined,
    stack: err && err.stack,
  };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    logError({ ...errorContext(req, err), statusCode: 500, code: 'HEADERS_SENT', message: err.message });
    return next(err);
  }
  // Enforced request size limit surfaces here (never a 500, never logged raw).
  if (err && err.type === 'entity.too.large') {
    logError({ method: req.method, route: req.path, statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' });
    return error(res, {
      message: 'Request body too large',
      code: 'PAYLOAD_TOO_LARGE',
      statusCode: 413,
    });
  }
  // Malformed JSON is a client error, not a server crash. express.json raises
  // a SyntaxError with status 400; map it to the validation envelope.
  if (err && (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400))) {
    logError({ method: req.method, route: req.path, statusCode: 400, code: 'INVALID_JSON', message: 'Invalid JSON body' });
    return error(res, {
      message: 'Invalid JSON body',
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'body', message: 'Request body must be valid JSON' }],
      statusCode: 400,
    });
  }
  logError({ ...errorContext(req, err), statusCode: 500, code: 'INTERNAL_ERROR', message: err.message });
  return error(res, {
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  });
}

function notFoundHandler(req, res) {
  logWarn({
    method: req.method,
    route: req.path,
    statusCode: 404,
    code: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
  return error(res, {
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
    statusCode: 404,
  });
}

module.exports = { errorHandler, notFoundHandler };
