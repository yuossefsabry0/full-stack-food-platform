'use strict';


require('./setup');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/config/database');

let counter = 0;

function uid(prefix) {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${counter}${rand}`.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 40);
}

function userPayload(prefix, overrides) {
  const tag = uid(prefix);
  return {
    name: `User ${tag}`.slice(0, 120),
    username: `u_${tag}`.slice(0, 60),
    email: `${tag}@test.example`.slice(0, 190),
    password: 'Secret123!',
    ...(overrides || {}),
  };
}

async function registerBasic(prefix, overrides) {
  const payload = userPayload(prefix, overrides);
  const res = await request(app).post('/api/auth/register').send(payload);
  return { payload, res };
}

async function login(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res;
}

async function loginAs(prefix) {
  const { payload, res } = await registerBasic(prefix);
  if (res.status !== 201) throw new Error(`setup register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const logged = await login(payload.username, payload.password);
  if (logged.status !== 200) throw new Error(`setup login failed: ${logged.status}`);
  return { payload, token: logged.body.data.accessToken, refreshToken: logged.body.data.refreshToken };
}

// Direct (admin-style) account creation for roles that have no public route.
async function createAccountDirect({ name, username, email, password, role, isActive }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const counterRow =
    (await prisma.userPublicIdCounter.findUnique({ where: { id: 1 } })) ||
    (await prisma.userPublicIdCounter.create({ data: { id: 1, lastValue: 9999 } }));
  const updated = await prisma.userPublicIdCounter.update({
    where: { id: 1 },
    data: { lastValue: { increment: 1 } },
  });
  void counterRow;
  return prisma.user.create({
    data: {
      publicId: String(updated.lastValue),
      name,
      username,
      email,
      passwordHash,
      role,
      isActive: isActive === undefined ? true : isActive,
    },
  });
}

async function loginDirect(prefix, role) {
  const tag = uid(prefix);
  const created = await createAccountDirect({
    name: `X ${tag}`,
    username: `u_${tag}`.slice(0, 60),
    email: `${tag}@test.example`,
    password: 'Secret123!',
    role,
  });
  const res = await login(created.username, 'Secret123!');
  if (res.status !== 200) throw new Error(`setup direct login failed: ${res.status}`);
  return { user: created, token: res.body.data.accessToken };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = {
  app,
  prisma,
  request,
  uid,
  userPayload,
  registerBasic,
  login,
  loginAs,
  createAccountDirect,
  loginDirect,
  auth,
};
