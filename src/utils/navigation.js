'use strict';

// Navigation concept for API consumers (buttons/links for a future Frontend).
// Every auth response carries the links needed to move between
// Login <-> Create Account, plus where to go next (Home after login).

const LINKS = {
  register: { rel: 'register', method: 'POST', href: '/api/auth/register', label: 'Create Account' },
  login: { rel: 'login', method: 'POST', href: '/api/auth/login', label: 'Log In' },
  home: { rel: 'home', method: 'GET', href: '/api/home', label: 'Go to Home' },
  // password recovery flow.
  forgotPassword: { rel: 'forgot-password', method: 'POST', href: '/api/auth/forgot-password', label: 'Forgot Password' },
  verifyOtp: { rel: 'verify-otp', method: 'POST', href: '/api/auth/verify-otp', label: 'Verify Code' },
  newPassword: { rel: 'new-password', method: 'POST', href: '/api/auth/reset-password', label: 'Set New Password' },
  // shop flow.
  menu: { rel: 'menu', method: 'GET', href: '/api/products', label: 'Menu' },
  cart: { rel: 'cart', method: 'GET', href: '/api/cart', label: 'Cart' },
  // order flow: confirm cart -> delivery address -> orders.
  confirmOrder: { rel: 'confirm-order', method: 'POST', href: '/api/cart/confirm', label: 'Confirm Order' },
  deliveryAddress: { rel: 'delivery-address', method: 'POST', href: '/api/orders/checkout', label: 'Delivery Address' },
  orders: { rel: 'orders', method: 'GET', href: '/api/orders', label: 'Orders' },
  // chef flow.
  chefRequests: { rel: 'chef-requests', method: 'GET', href: '/api/chef/requests', label: 'Request Orders' },
  chefHistory: { rel: 'chef-history', method: 'GET', href: '/api/chef/history', label: 'Previous Orders' },
  // delivery flow.
  deliveryCurrent: { rel: 'delivery-current', method: 'GET', href: '/api/delivery/orders/current', label: 'Current Orders' },
  deliveryPrevious: { rel: 'delivery-previous', method: 'GET', href: '/api/delivery/orders/previous', label: 'Previous Orders' },
  // admin dashboard flow.
  adminDashboard: { rel: 'admin-dashboard', method: 'GET', href: '/api/admin', label: 'Admin Dashboard' },
  adminUsers: { rel: 'admin-users', method: 'GET', href: '/api/admin/users', label: 'Users' },
  adminProducts: { rel: 'admin-products', method: 'GET', href: '/api/admin/products', label: 'Products' },
  adminOrders: { rel: 'admin-orders', method: 'GET', href: '/api/admin/orders', label: 'Orders' },
  adminStaff: { rel: 'admin-staff', method: 'GET', href: '/api/admin/staff', label: 'Staff' },
  // analytics.
  adminAnalytics: { rel: 'admin-analytics', method: 'GET', href: '/api/admin/analytics', label: 'Analytics' },
};

function authNavigation(current) {
  const links = [];
  if (current !== 'register') links.push(LINKS.register);
  if (current !== 'login') links.push(LINKS.login);
  return { links };
}

function homeNavigation() {
  return { links: [LINKS.home] };
}

// navigation for the password-recovery flow.
// `stay` (incorrect OTP): no `next` — the client stays on the OTP route.
// `toVerify` / `toNewPassword` / `toLogin`: forward movement only.
function passwordFlowNavigation(step) {
  const links = [LINKS.forgotPassword, LINKS.verifyOtp, LINKS.newPassword, LINKS.login];
  const next =
    step === 'toVerify'
      ? LINKS.verifyOtp
      : step === 'toNewPassword'
        ? LINKS.newPassword
        : step === 'toLogin'
          ? LINKS.login
          : step === 'toForgot'
            ? LINKS.forgotPassword
            : undefined;
  const navigation = { links };
  if (next) navigation.next = next;
  return navigation;
}

module.exports = { LINKS, authNavigation, homeNavigation, passwordFlowNavigation };
