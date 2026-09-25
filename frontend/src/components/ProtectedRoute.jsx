import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// Preserves the existing auth/role behavior: unauthenticated -> /login,
// wrong role -> their own landing (no weakening or bypass).
export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children || <Outlet />;
}

export function RequireRole({ roles, children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!roles.includes(role)) {
    const fallback =
      role === 'ADMIN' ? '/admin' : role === 'CHEF' ? '/chef/requests' : role === 'DELIVERY' ? '/delivery/current' : '/home';
    return <Navigate to={fallback} replace />;
  }
  return children || <Outlet />;
}
