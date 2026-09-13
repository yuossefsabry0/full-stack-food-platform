'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const { request, app, prisma, registerBasic, login } = require('../helpers');

after(() => prisma.$disconnect());

describe('forgot password + otp + reset', () => {
  it('answers generically whether or not the email exists', async () => {
    const { payload } = await registerBasic('pwgen');
    const known = await request(app).post('/api/auth/forgot-password').send({ email: payload.email });
    assert.equal(known.status, 200);
    assert.ok(known.body.data.devOtp);
    assert.equal(known.body.navigation.next.rel, 'verify-otp');

    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost_missing@test.example' });
    assert.equal(unknown.status, 200);
    assert.equal(unknown.body.message, known.body.message);
    assert.ok(!unknown.body.data || !unknown.body.data.devOtp);
  });

  it('wrong OTP stays (400, no next); correct OTP moves to new password', async () => {
    const { payload } = await registerBasic('pwotp');
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: payload.email });
    const otp = forgot.body.data.devOtp;

    const wrong = await request(app).post('/api/auth/verify-otp').send({ email: payload.email, otp: '000000' });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.code, 'OTP_INCORRECT');
    assert.ok(!wrong.body.navigation || !wrong.body.navigation.next);

    const right = await request(app).post('/api/auth/verify-otp').send({ email: payload.email, otp });
    assert.equal(right.status, 200);
    assert.ok(right.body.data.resetToken);
    assert.equal(right.body.navigation.next.rel, 'new-password');

    const reuse = await request(app).post('/api/auth/verify-otp').send({ email: payload.email, otp });
    assert.equal(reuse.status, 400);
  });

  it('locks the OTP after five wrong attempts', async () => {
    const { payload } = await registerBasic('pwlock');
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: payload.email });
    const otp = forgot.body.data.devOtp;
    for (let i = 0; i < 4; i += 1) {
      const r = await request(app).post('/api/auth/verify-otp').send({ email: payload.email, otp: '111111' });
      assert.equal(r.status, 400);
    }
    const fifth = await request(app).post('/api/auth/verify-otp').send({ email: payload.email, otp: '111111' });
    assert.equal(fifth.status, 429);
    assert.equal(fifth.body.code, 'OTP_ATTEMPTS_EXCEEDED');
    const afterLock = await request(app).post('/api/auth/verify-otp').send({ email: payload.email, otp });
    assert.notEqual(afterLock.status, 200);
  });

  it('rejects expired OTPs and points back to forgot-password', async () => {
    const { payload } = await registerBasic('pwexp');
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: payload.email });
    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    await prisma.passwordResetOtp.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const r = await request(app).post('/api/auth/verify-otp').send({ email: payload.email, otp: forgot.body.data.devOtp });
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'OTP_EXPIRED');
  });

  it('resets the password: mismatch rejected, then login works with the new one', async () => {
    const { payload } = await registerBasic('pwreset');
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: payload.email });
    const verified = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: payload.email, otp: forgot.body.data.devOtp });
    const resetToken = verified.body.data.resetToken;

    const mismatch = await request(app).post('/api/auth/reset-password').send({
      email: payload.email, resetToken, password: 'NewSecret123!', confirmPassword: 'Other123!',
    });
    assert.equal(mismatch.status, 400);

    const done = await request(app).post('/api/auth/reset-password').send({
      email: payload.email, resetToken, password: 'NewSecret123!', confirmPassword: 'NewSecret123!',
    });
    assert.equal(done.status, 200);
    assert.equal(done.body.navigation.next.rel, 'login');

    const reused = await request(app).post('/api/auth/reset-password').send({
      email: payload.email, resetToken, password: 'XSecret123!', confirmPassword: 'XSecret123!',
    });
    assert.equal(reused.status, 400);

    const oldLogin = await login(payload.username, payload.password);
    assert.equal(oldLogin.status, 401);
    const newLogin = await login(payload.username, 'NewSecret123!');
    assert.equal(newLogin.status, 200);
  });
});
