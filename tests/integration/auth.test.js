'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const { request, app, prisma, registerBasic, login } = require('../helpers');

after(() => prisma.$disconnect());

describe('authentication', () => {
  it('registers a BASIC account and points to login (no auto-login)', async () => {
    const { payload, res } = await registerBasic('authreg');
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'BASIC');
    assert.match(res.body.data.user.userCode, /^\d{5,}$/);
    assert.equal(res.body.data.accessToken, undefined);
    assert.equal(res.body.navigation.next.rel, 'login');
    assert.equal(res.body.data.user.username, payload.username);
  });

  it('rejects duplicate username/email and role injection', async () => {
    const first = await registerBasic('authdup');
    assert.equal(first.res.status, 201);
    const dupUser = await request(app).post('/api/auth/register').send({ ...first.payload, email: 'other@test.example' });
    assert.equal(dupUser.status, 409);
    assert.equal(dupUser.body.code, 'ACCOUNT_EXISTS');
    const dupEmail = await request(app).post('/api/auth/register').send({ ...first.payload, username: 'totally_different_name_xyz' });
    assert.equal(dupEmail.status, 409);
    const withRole = await request(app)
      .post('/api/auth/register')
      .send({ ...first.payload, username: 'role_inject_xyz', email: 'inject@test.example', role: 'ADMIN' });
    assert.equal(withRole.status, 400);
    assert.equal(withRole.body.code, 'VALIDATION_ERROR');
  });

  it('validates registration input', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'x' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.length > 0);
  });

  it('logs in with username+password and returns tokens + home nav', async () => {
    const { payload } = await registerBasic('authlogin');
    const res = await login(payload.username, payload.password);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.accessToken);
    assert.ok(res.body.data.refreshToken);
    assert.equal(res.body.data.tokenType, 'Bearer');
    assert.equal(res.body.navigation.next.rel, 'home');
  });

  it('rejects wrong credentials without distinguishing', async () => {
    const { payload } = await registerBasic('authbad');
    const wrongPw = await login(payload.username, 'Wrong123!');
    assert.equal(wrongPw.status, 401);
    assert.equal(wrongPw.body.code, 'INVALID_CREDENTIALS');
    const unknown = await login('nobody_present_xyz', 'Whatever123!');
    assert.equal(unknown.status, 401);
    assert.equal(unknown.body.code, 'INVALID_CREDENTIALS');
  });
});

describe('refresh tokens', () => {
  it('rotates the pair and revokes the old token', async () => {
    const { payload } = await registerBasic('authref');
    const logged = await login(payload.username, payload.password);
    const rt = logged.body.data.refreshToken;

    const refreshed = await request(app).post('/api/auth/refresh').send({ refreshToken: rt });
    assert.equal(refreshed.status, 200);
    assert.notEqual(refreshed.body.data.refreshToken, rt);
    assert.equal(refreshed.body.navigation.next.rel, 'home');

    const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken: rt });
    assert.equal(reuse.status, 401);
    assert.equal(reuse.body.code, 'INVALID_REFRESH_TOKEN');
  });

  it('rejects access tokens and garbage at the refresh endpoint', async () => {
    const { payload } = await registerBasic('authref2');
    const logged = await login(payload.username, payload.password);
    const withAccess = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: logged.body.data.accessToken });
    assert.equal(withAccess.status, 401);
    const garbage = await request(app).post('/api/auth/refresh').send({ refreshToken: 'nope' });
    assert.equal(garbage.status, 401);
    const missing = await request(app).post('/api/auth/refresh').send({});
    assert.equal(missing.status, 400);
  });

  it('expired access tokens are rejected on protected routes', async () => {
    const res = await request(app).get('/api/home');
    assert.equal(res.status, 401);
    const bad = await request(app).get('/api/home').set('Authorization', 'Bearer invalid.token.here');
    assert.equal(bad.status, 401);
  });
});
