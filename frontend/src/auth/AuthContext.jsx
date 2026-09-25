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
  const logout = useCallback(() => {
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
      isAuthenticated: Boolean(auth.accessToken && auth.user),
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
