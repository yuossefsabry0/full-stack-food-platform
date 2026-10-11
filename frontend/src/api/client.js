// Thin fetch wrapper over the EXISTING backend API contracts.
// No endpoint, field, role, or status is invented here — paths mirror
// src/routes/*.js on the backend exactly.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');

function getAccessToken() {
  return localStorage.getItem('fp_accessToken') || '';
}

function getRefreshToken() {
  try {
    return localStorage.getItem('fp_refreshToken') || '';
  } catch {
    return '';
  }
}

function setStoredTokens({ accessToken, refreshToken, user }) {
  try {
    if (accessToken !== undefined) localStorage.setItem('fp_accessToken', accessToken || '');
    if (refreshToken !== undefined) localStorage.setItem('fp_refreshToken', refreshToken || '');
    if (user !== undefined) localStorage.setItem('fp_user', JSON.stringify(user || null));
  } catch {
    // storage unavailable (private mode): API retry still uses the response below
  }
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('fp:tokens-updated', {
          detail: { accessToken, refreshToken, user },
        })
      );
    }
  } catch {
    // event dispatch is best-effort; AuthContext re-reads storage on navigation
  }
}

// Single-flight refresh: concurrent 401s share one /auth/refresh call.
let refreshPromise = null;

async function tryRefreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      let payload = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
      if (!res.ok) return null;
      return (payload && payload.data) || null;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  const data = await refreshPromise;
  if (!data || !data.accessToken) return null;
  setStoredTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
  return data;
}

// Guest browse routes where an auth/refresh failure must NOT force a Login
// redirect — the visitor simply continues as a guest. Every other route keeps
// the existing forced-redirect-on-failed-refresh behavior.
function isGuestBrowseRoute() {
  try {
    if (typeof window === 'undefined' || !window.location) return true;
    const pathname = window.location.pathname;
    return pathname === '/home' || pathname === '/menu';
  } catch {
    return false;
  }
}

function handleUnauthorizedRedirect(status) {
  if (status !== 401) return;
  try {
    if (typeof window === 'undefined' || !window.location) return;
    if (window.location.pathname === '/home' || window.location.pathname === '/menu') return;
    if (window.location.pathname === '/login') return;
    window.location.href = '/login';
  } catch {
    // ignore redirect failures (non-browser / tests)
  }
}

export async function apiFetch(path, { method = 'GET', body, auth = false, skipAuthRedirect = false, _retried = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) {
    // One silent refresh-and-retry for expired access tokens: same request is
    // replayed once with the rotated pair. Never loops (guarded by _retried),
    // never runs for the refresh call itself or when the caller opted out via
    // skipAuthRedirect (guest-cap fetch keeps its existing fallback).
    if (
      res.status === 401 &&
      auth &&
      !_retried &&
      !skipAuthRedirect &&
      !path.startsWith('/auth/refresh') &&
      !path.startsWith('/auth/login')
    ) {
      const refreshed = await tryRefreshTokens().catch(() => null);
      if (refreshed && refreshed.accessToken) {
        return apiFetch(path, { method, body, auth, skipAuthRedirect, _retried: true });
      }
    }
    const message = (payload && (payload.message || payload.error)) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    // Narrow auth-failure handling: skip the Login redirect only on the public
    // Home/Menu browse routes (checked via window.location.pathname); every
    // other page keeps the existing forced redirect. Successful requests and
    // non-401 failures are unchanged. Exported check reused for refresh flows.
    if (res.status === 401 && !skipAuthRedirect && !isGuestBrowseRoute()) {
      handleUnauthorizedRedirect(res.status);
    }
    throw err;
  }
  return payload;
}

export const api = {
  // auth (public)
  register: (body) => apiFetch('/auth/register', { method: 'POST', body }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body }),
  refresh: (refreshToken) => apiFetch('/auth/refresh', { method: 'POST', body: { refreshToken } }),
  logout: (body) => apiFetch('/auth/logout', { method: 'POST', auth: true, body, skipAuthRedirect: true }),
  forgotPassword: (body) => apiFetch('/auth/forgot-password', { method: 'POST', body }),
  verifyOtp: (body) => apiFetch('/auth/verify-otp', { method: 'POST', body }),
  resetPassword: (body) => apiFetch('/auth/reset-password', { method: 'POST', body }),

  // home (auth required, any role — BASIC landing uses it for greeting only)
  home: () => apiFetch('/home', { auth: true }),

  // products / menu (public)
  menu: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return apiFetch(`/products${qs ? `?${qs}` : ''}`);
  },
  productDetails: (id) => apiFetch(`/products/${id}`),

  // cart (BASIC)
  cart: () => apiFetch('/cart', { auth: true }),
  cartConfirm: () => apiFetch('/cart/confirm', { method: 'POST', auth: true }),
  cartAdd: (body) => apiFetch('/cart/items', { method: 'POST', auth: true, body }),
  cartUpdate: (productId, body) => apiFetch(`/cart/items/${productId}`, { method: 'PATCH', auth: true, body }),
  cartRemove: (productId) => apiFetch(`/cart/items/${productId}`, { method: 'DELETE', auth: true }),

  // orders (BASIC)
  checkout: (body) => apiFetch('/orders/checkout', { method: 'POST', auth: true, body }),
  orders: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return apiFetch(`/orders${qs ? `?${qs}` : ''}`, { auth: true });
  },
  orderDetails: (id) => apiFetch(`/orders/${id}`, { auth: true }),

  // chef (CHEF)
  chefRequests: () => apiFetch('/chef/requests', { auth: true }),
  chefPrepare: (id) => apiFetch(`/chef/requests/${id}/prepare`, { method: 'POST', auth: true }),
  chefHandover: (id) => apiFetch(`/chef/requests/${id}/handover`, { method: 'POST', auth: true }),
  chefHistory: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return apiFetch(`/chef/history${qs ? `?${qs}` : ''}`, { auth: true });
  },

  // delivery (DELIVERY)
  deliveryCurrent: () => apiFetch('/delivery/orders/current', { auth: true }),
  deliveryAccept: (id) => apiFetch(`/delivery/orders/${id}/accept`, { method: 'POST', auth: true }),
  deliveryDeliver: (id) => apiFetch(`/delivery/orders/${id}/deliver`, { method: 'POST', auth: true }),
  deliveryPrevious: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return apiFetch(`/delivery/orders/previous${qs ? `?${qs}` : ''}`, { auth: true });
  },

  // admin (ADMIN)
  adminDashboard: () => apiFetch('/admin', { auth: true }),
  adminUsers: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return apiFetch(`/admin/users${qs ? `?${qs}` : ''}`, { auth: true });
  },
  adminProducts: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return apiFetch(`/admin/products${qs ? `?${qs}` : ''}`, { auth: true });
  },
  adminAddProduct: (body) => apiFetch('/admin/products', { method: 'POST', auth: true, body }),
  adminEditProduct: (id, body) => apiFetch(`/admin/products/${id}`, { method: 'PATCH', auth: true, body }),
  adminOrders: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return apiFetch(`/admin/orders${qs ? `?${qs}` : ''}`, { auth: true });
  },
  adminStaff: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return apiFetch(`/admin/staff${qs ? `?${qs}` : ''}`, { auth: true });
  },
  adminAddStaff: (body) => apiFetch('/admin/staff', { method: 'POST', auth: true, body }),
  adminEditStaff: (id, body) => apiFetch(`/admin/staff/${id}`, { method: 'PATCH', auth: true, body }),
  adminAnalytics: () => apiFetch('/admin/analytics', { auth: true }),
};

export { BASE_URL, getAccessToken, getRefreshToken, setStoredTokens };
