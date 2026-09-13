'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  sha256Hex,
  accessTokenExpiryDate,
  refreshTokenExpiryDate,
} = require('../../src/services/token.service');

describe('token service', () => {
  it('issues verifiable access tokens with distinct jti values', () => {
    const a = signAccessToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    const b = signAccessToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    assert.notEqual(a, b);
    const payload = verifyAccessToken(a);
    assert.equal(payload.sub, 1);
    assert.equal(payload.userCode, '10000');
    assert.equal(payload.type, 'ACCESS');
  });

  it('keeps access and refresh validation separate', () => {
    const access = signAccessToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    const refresh = signRefreshToken({ internalId: 1, publicId: '10000', role: 'BASIC' });
    // Cross-secret verification always fails (wrong secret or wrong type).
    assert.throws(() => verifyAccessToken(refresh));
    assert.throws(() => verifyRefreshToken(access));
    assert.equal(verifyRefreshToken(refresh).type, 'REFRESH');
  });

  it('uses separate expirations with refresh outliving access', () => {
    assert.ok(refreshTokenExpiryDate().getTime() > accessTokenExpiryDate().getTime());
  });

  it('hashes tokens deterministically', () => {
    assert.equal(sha256Hex('abc'), sha256Hex('abc'));
    assert.equal(sha256Hex('abc').length, 64);
  });
});
