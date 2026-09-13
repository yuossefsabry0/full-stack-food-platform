'use strict';

// Unified JSON envelope for the whole API (future-Frontend friendly).
//
// Success:
// {
//   "success": true,
//   "message": "...",
//   "data": { ... } | null,
//   "navigation": { "links": [ { "rel": "...", "method": "...", "href": "...", "label": "..." } ] } | null,
//   "meta": { ... } | null
// }
//
// Error:
// {
//   "success": false,
//   "message": "...",
//   "code": "STRING_CODE",
//   "errors": [ { "field": "...", "message": "..." } ] | null,
//   "navigation": { ... } | null   // optional (OTP stay/redirect hints)
// }

function success(res, { message = 'OK', data = null, navigation = null, meta = null, statusCode = 200 } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    navigation,
    meta,
  });
}

function error(res, { message = 'Error', code = 'ERROR', errors = null, navigation = null, statusCode = 500 } = {}) {
  // `navigation` is only present when explicitly provided
  // shapes are unchanged.
  const body = {
    success: false,
    message,
    code,
    errors,
  };
  if (navigation) body.navigation = navigation;
  return res.status(statusCode).json(body);
}

module.exports = { success, error };
