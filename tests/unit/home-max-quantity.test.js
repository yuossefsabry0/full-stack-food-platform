'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const { home } = require('../../src/controllers/home.controller');
const { MAX_QUANTITY } = require('../../src/validations/cart.validation');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

const USER = {
  name: 'Ted',
  publicId: '10000',
  username: 'ted',
  email: 'ted@test.example',
  role: 'BASIC',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('home response maxQuantity field (mocked)', () => {
  it('exposes the server cap for guests', () => {
    const res = mockRes();
    home({ user: null }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.maxQuantity, MAX_QUANTITY);
    assert.equal(res.body.data.user, null);
  });

  it('exposes the server cap for authenticated users without changing identity', () => {
    const res = mockRes();
    home({ user: USER }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.maxQuantity, MAX_QUANTITY);
    assert.equal(res.body.data.user.username, 'ted');
  });
});
