import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// Minimal role header for non-BASIC areas. Deliberately NOT the dark-blue
// BASIC navbar (different links, different style) — CHEF/DELIVERY/Admin get
// their own shell, per scope restrictions.
export function RoleHeader({ title, links }) {
  const { logout, user } = useAuth();
  return (
    <header
      style={{
        background: '#111827',
        color: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <strong>{title}</strong>
        <nav style={{ display: 'flex', gap: 12, flex: 1 }}>
          {links.map((l) => (
            <Link key={l.to} to={l.to} style={{ color: '#fff', opacity: 0.9, textDecoration: 'none' }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="muted" style={{ color: '#d1d5db', fontSize: 13 }}>
          {user?.username}
        </span>
        <button
          type="button"
          onClick={logout}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,.6)',
            color: '#fff',
            borderRadius: 8,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export const CHEF_LINKS = [
  { to: '/chef/requests', label: 'Requests' },
  { to: '/chef/history', label: 'History' },
];

export const DELIVERY_LINKS = [
  { to: '/delivery/current', label: 'Current' },
  { to: '/delivery/previous', label: 'Previous' },
];

export const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/staff', label: 'Staff' },
  { to: '/admin/analytics', label: 'Analytics' },
];
