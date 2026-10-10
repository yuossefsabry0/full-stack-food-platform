import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    return {
      accessToken: localStorage.getItem('fp_accessToken') || '',
      refreshToken: localStorage.getItem('fp_refreshToken') || '',
      user: JSON.parse(localStorage.getItem('fp_user') || 'null'),
    };
  } catch {
    return { accessToken: '', refreshToken: '', user: null };
  }
}

// Guest-safety check for the navbar: a stored access token that is already
// expired must not count as logged in, otherwise "Log Out" would show on
// Home for a visitor whose session is no longer valid. Non-JWT values fall
// back to the existing presence check so valid sessions are unaffected.
function isStoredSessionValid(accessToken, user) {
  if (!accessToken || !user) return false;
  try {
    const parts = String(accessToken).split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload && typeof payload.exp === 'number') {
      return payload.exp * 1000 > Date.now();
    }
    return true;
  } catch {
    return true;
  }
}

// Existing session logic: tokens + identity in localStorage.
// Login stores them; logout clears them and redirects to Login.
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);
  const navigate = useNavigate();

  const login = useCallback(async (username, password) => {
    const res = await api.login({ username, password });
    const { user, accessToken, refreshToken } = res.data || {};
    localStorage.setItem('fp_accessToken', accessToken || '');
    localStorage.setItem('fp_refreshToken', refreshToken || '');
    localStorage.setItem('fp_user', JSON.stringify(user || null));
    setAuth({ accessToken: accessToken || '', refreshToken: refreshToken || '', user: user || null });
    return user;
  }, []);

  // Uses the EXISTING logout/session-clearing logic: clear stored tokens,
  // redirect to Login. Shared by the BASIC navbar and the Admin dashboard.
  const logout = useCallback(async (options) => {
    const refreshToken = (() => {
      try {
        return localStorage.getItem('fp_refreshToken') || '';
      } catch {
        return '';
      }
    })();
    try {
      const body = {};
      if (refreshToken) body.refreshToken = refreshToken;
      if (options && options.allSessions === true) body.allSessions = true;
      await api.logout(body);
    } catch {
      // Server-side logout is best-effort: local state is cleared below
      // even if the request fails (and it never triggers a refresh loop).
    }
    localStorage.removeItem('fp_accessToken');
    localStorage.removeItem('fp_refreshToken');
    localStorage.removeItem('fp_user');
    setAuth({ accessToken: '', refreshToken: '', user: null });
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      user: auth.user,
      role: auth.user?.role || null,
      isAuthenticated: Boolean(
        auth.accessToken && auth.user && isStoredSessionValid(auth.accessToken, auth.user)
      ),
      login,
      logout,
    }),
    [auth, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
