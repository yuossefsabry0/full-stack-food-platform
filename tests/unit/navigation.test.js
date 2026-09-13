'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const { LINKS, authNavigation, homeNavigation, passwordFlowNavigation } = require('../../src/utils/navigation');

describe('navigation links', () => {
  it('exposes every flow with method + href + label', () => {
    for (const key of [
      'register', 'login', 'home', 'forgotPassword', 'verifyOtp', 'newPassword',
      'menu', 'cart', 'confirmOrder', 'deliveryAddress', 'orders',
      'chefRequests', 'chefHistory', 'deliveryCurrent', 'deliveryPrevious',
      'adminDashboard', 'adminUsers', 'adminProducts', 'adminOrders', 'adminStaff', 'adminAnalytics',
    ]) {
      const link = LINKS[key];
      assert.ok(link, `missing link ${key}`);
      assert.ok(link.method && link.href && link.label, `incomplete link ${key}`);
    }
  });

  it('auth navigation toggles between login and register', () => {
    const onRegister = authNavigation('register');
    assert.ok(onRegister.links.some((l) => l.rel === 'login'));
    assert.ok(!onRegister.links.some((l) => l.rel === 'register'));
    const onLogin = authNavigation('login');
    assert.ok(onLogin.links.some((l) => l.rel === 'register'));
  });

  it('home navigation points at home', () => {
    assert.equal(homeNavigation().links[0].rel, 'home');
  });

  it('password flow moves forward without skipping', () => {
    assert.equal(passwordFlowNavigation('toVerify').next.rel, 'verify-otp');
    assert.equal(passwordFlowNavigation('toNewPassword').next.rel, 'new-password');
    assert.equal(passwordFlowNavigation('toLogin').next.rel, 'login');
    assert.equal(passwordFlowNavigation('toForgot').next.rel, 'forgot-password');
  });
});
