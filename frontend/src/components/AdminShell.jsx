import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import styles from '../pages/AdminDashboard.module.css';

// Shared admin shell: identical fixed left sidebar dimensions on every admin
// section (Dashboard / Users / Products / Orders / Chef / Delivery / Staff /
// Analytics), matching the design concept. Presentational only — page logic,
// API calls, routes and payloads live in each page and are unchanged.
const LINKS = [
  { key: 'dashboard', to: '/admin', label: 'Dashboard' },
  { key: 'users', to: '/admin/users', label: 'Users' },
  { key: 'products', to: '/admin/products', label: 'Products' },
  { key: 'orders', to: '/admin/orders', label: 'Orders' },
  { key: 'chef', to: '/admin/staff?role=CHEF', label: 'Chef Management' },
  { key: 'delivery', to: '/admin/staff?role=DELIVERY', label: 'Delivery Management' },
  { key: 'staff', to: '/admin/staff', label: 'All Staff' },
  { key: 'analytics', to: '/admin/analytics', label: 'Analytics' },
];

export default function AdminShell({ active, title, sub, actions, children }) {
  const { logout, user } = useAuth();
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Admin navigation">
        <div className={styles.sideBrand}>
          <span className={styles.sideBrandMark} aria-hidden="true">J</span>
          Joo food
        </div>
        <nav className={styles.sideNav}>
          {LINKS.map((l) => (
            <Link
              key={l.key}
              to={l.to}
              className={`${styles.sideLink} ${active === l.key ? styles.sideLinkActive : ''}`}
              aria-current={active === l.key ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button type="button" className={styles.sideLogout} onClick={logout}>
          ↩ Logout
        </button>
      </aside>
      <main className={styles.main}>
        {(title || actions) && (
          <div className={styles.sectionHead}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && <h1 className={styles.sectionTitle}>{title}</h1>}
              {sub && <p className={styles.sectionSub}>{sub}</p>}
            </div>
            <div className={styles.userChip}>
              <span className={styles.userName}>{user?.username || 'admin'}</span>
              {actions}
              <button type="button" className={styles.logout} onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
