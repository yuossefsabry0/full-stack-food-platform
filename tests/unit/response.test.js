'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const { success, error } = require('../../src/utils/response');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('response envelope', () => {
  it('builds the success shape with data/navigation/meta', () => {
    const res = mockRes();
    success(res, { message: 'ok', data: { a: 1 }, navigation: { links: [] }, meta: { p: 1 }, statusCode: 201 });
    assert.deepEqual(res.body, {
      success: true,
      message: 'ok',
      data: { a: 1 },
      navigation: { links: [] },
      meta: { p: 1 },
    });
    assert.equal(res.statusCode, 201);
  });

  it('builds the error shape and only adds navigation when provided', () => {
    const plain = mockRes();
    error(plain, { message: 'bad', code: 'X', errors: [{ field: 'a', message: 'm' }], statusCode: 400 });
    assert.deepEqual(plain.body, { success: false, message: 'bad', code: 'X', errors: [{ field: 'a', message: 'm' }] });

    const nav = mockRes();
    error(nav, { message: 'bad', navigation: { links: [] }, statusCode: 400 });
    assert.deepEqual(nav.body.navigation, { links: [] });
  });
});
