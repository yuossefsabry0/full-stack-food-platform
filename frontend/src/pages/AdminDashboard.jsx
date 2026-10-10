import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import styles from './AdminDashboard.module.css';

// Admin entry view: grid of cards mapped ONLY to existing admin routes.
// Distinct from the BASIC /home route; ADMIN never sees the BASIC navbar.
const SECTIONS = [
  { to: '/admin/users', title: 'Users', text: 'Browse customer accounts (name, username, code, email).' },
  { to: '/admin/products', title: 'Products', text: 'View, add, edit, activate or deactivate menu products.' },
  { to: '/admin/orders', title: 'Orders', text: 'All current orders with status filters and sorting.' },
  { to: '/admin/staff?role=CHEF', title: 'Chef Management', text: 'View and manage CHEF staff accounts.' },
  { to: '/admin/staff?role=DELIVERY', title: 'Delivery Management', text: 'View and manage DELIVERY staff accounts.' },
  { to: '/admin/staff', title: 'All Staff', text: 'Combined CHEF + DELIVERY staff overview.' },
  { to: '/admin/analytics', title: 'Analytics', text: 'Delivered-only sales totals and per-product units.' },
];

export default function AdminDashboard() {
  const { logout, user } = useAuth();

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className={styles.eyebrow}>Joo Food · Administration</p>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.sub}>
            Signed in as {user?.name || user?.username || 'Admin'}. Choose a section below.
          </p>
          <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className={styles.sub} style={{ margin: 0 }}>Username</span>
              <strong>{user?.username || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className={styles.sub} style={{ margin: 0 }}>User code</span>
              <strong>{user?.userCode || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className={styles.sub} style={{ margin: 0 }}>Role</span>
              <strong>{user?.role || 'ADMIN'}</strong>
            </div>
          </div>
        </div>
        {/* Admin logout lives on the dashboard (no shared top navbar here). */}
        <button type="button" className={styles.logout} onClick={logout}>
          Logout
        </button>
      </div>
      <div className={styles.grid}>
        {SECTIONS.map((s) => (
          <Link key={s.title} to={s.to} className={styles.card}>
            <h2 className={styles.cardTitle}>{s.title}</h2>
            <p className={styles.cardText}>{s.text}</p>
            <span className={styles.sub} style={{ margin: 0, fontSize: 13 }}>{s.to}</span>
            <span
              className={styles.cardCta}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                background: '#111827',
                color: '#fff',
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
