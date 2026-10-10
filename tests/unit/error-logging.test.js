'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const loggerModule = require('../../src/utils/logger');
const { errorHandler } = require('../../src/middlewares/error.middleware');

describe('500 error logging (mocked logger)', () => {
  let captured;
  let originalError;

  beforeEach(() => {
    captured = null;
    originalError = loggerModule.logger.error;
    loggerModule.logger.error = (message, meta) => { captured = { message, meta }; };
  });

  afterEach(() => {
    loggerModule.logger.error = originalError;
  });

  it('logs the stack server-side but never returns it to the client', () => {
    const err = new Error('boom');
    const req = {
      method: 'GET',
      path: '/api/orders',
      user: { id: 7 },
      body: { password: 'Secret123!' },
      headers: { authorization: 'Bearer abc' },
    };
    const res = {
      headersSent: false,
      statusCode: null,
      body: null,
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; },
    };
    errorHandler(err, req, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.code, 'INTERNAL_ERROR');
    assert.ok(!JSON.stringify(res.body).includes('boom'));
    assert.ok(captured.meta.stack.includes('boom'));
    assert.equal(captured.meta.userId, 7);
    assert.equal(captured.meta.method, 'GET');
    assert.equal(captured.meta.route, '/api/orders');
  });
});
