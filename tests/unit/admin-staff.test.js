'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const prisma = require('../../src/config/database');
const { updateStaff } = require('../../src/services/admin.service');

const STAFF = { id: 5, role: 'CHEF', publicId: '10005', name: 'Chef', username: 'chef1', email: 'chef1@test.example', isActive: true, createdAt: new Date() };

describe('updateStaff duplicate check', () => {
  let origUser;
  let seenWhere;
  let clashRow;

  beforeEach(() => {
    origUser = prisma.user;
    seenWhere = null;
    clashRow = null;
    prisma.user = {
      findUnique: async () => STAFF,
      findFirst: async (args) => { seenWhere = args.where; return clashRow; },
      update: async () => STAFF,
    };
  });

  afterEach(() => {
    prisma.user = origUser;
  });

  it('checks only username when only username is provided', async () => {
    await updateStaff(1, 5, { username: 'newname' });
    assert.deepEqual(seenWhere, {
      AND: [{ id: { not: 5 } }, { OR: [{ username: 'newname' }] }],
    });
  });

  it('checks only email when only email is provided', async () => {
    await updateStaff(1, 5, { email: 'new@test.example' });
    assert.deepEqual(seenWhere, {
      AND: [{ id: { not: 5 } }, { OR: [{ email: 'new@test.example' }] }],
    });
  });

  it('checks both when both are provided', async () => {
    await updateStaff(1, 5, { username: 'newname', email: 'new@test.example' });
    assert.deepEqual(seenWhere, {
      AND: [{ id: { not: 5 } }, { OR: [{ username: 'newname' }, { email: 'new@test.example' }] }],
    });
  });

  it('skips the check when neither is provided', async () => {
    await updateStaff(1, 5, { name: 'New Name' });
    assert.equal(seenWhere, null);
  });
});
