'use strict';

const { error } = require('../utils/response');

// Validates req.body against a Zod schema. On failure -> 400 VALIDATION_ERROR.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return validationError(res, result.error);
    }
    req.body = result.data;
    return next();
  };
}

function validationError(res, zodError) {
  const errors = zodError.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
  return error(res, {
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    errors,
    statusCode: 400,
  });
}

// validates req.query (search/pagination). Parsed values are exposed
// as req.validatedQuery (req.query is left untouched for compatibility).
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return validationError(res, result.error);
    }
    req.validatedQuery = result.data;
    return next();
  };
}

// validates req.params (e.g. numeric product id).
function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return validationError(res, result.error);
    }
    req.validatedParams = result.data;
    return next();
  };
}

validate.query = validateQuery;
validate.params = validateParams;

module.exports = validate;
