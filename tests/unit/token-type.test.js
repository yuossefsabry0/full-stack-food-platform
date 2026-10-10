'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const jwt = require('jsonwebtoken');
const env = require('../../src/config/env');
const {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../../src/services/token.service');

describe('jwt type claim', () => {
  it('accepts tokens with the correct type', () => {
    const access = signAccessToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    assert.equal(verifyAccessToken(access).type, 'ACCESS');
    const refresh = signRefreshToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    assert.equal(verifyRefreshToken(refresh).type, 'REFRESH');
  });

  it('rejects tokens with a missing type claim', () => {
    const noTypeAccess = jwt.sign({ sub: 1 }, env.jwtAccessSecret, { expiresIn: '15m' });
    assert.throws(() => verifyAccessToken(noTypeAccess));
    const noTypeRefresh = jwt.sign({ sub: 1 }, env.jwtRefreshSecret, { expiresIn: '7d' });
    assert.throws(() => verifyRefreshToken(noTypeRefresh));
  });

  it('rejects tokens with the wrong type claim', () => {
    const access = signAccessToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    assert.throws(() => verifyRefreshToken(access));
    const refresh = signRefreshToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    assert.throws(() => verifyAccessToken(refresh));
  });
});
