'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const { hashPassword, comparePassword } = require('../../src/utils/password');

describe('password hashing', () => {
  it('hashes and verifies, rejects wrong passwords, never stores plaintext', async () => {
    const hash = await hashPassword('Secret123!');
    assert.notEqual(hash, 'Secret123!');
    assert.ok(await comparePassword('Secret123!', hash));
    assert.equal(await comparePassword('Wrong123!', hash), false);
  });
});
