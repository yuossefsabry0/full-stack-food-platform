import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';
import styles from './AdminDashboard.module.css';

// Admin entry view: grid of cards mapped ONLY to existing admin routes.
// Distinct from the BASIC /home route; ADMIN never sees the BASIC navbar.
const SECTIONS = [
  { to: '/admin/users', title: 'Users', text: 'Browse customer accounts (name, username, code, email).', icon: '👥' },
  { to: '/admin/products', title: 'Products', text: 'View, add, edit, activate or deactivate menu products.', icon: '🍕' },
  { to: '/admin/orders', title: 'Orders', text: 'All current orders with status filters and sorting.', icon: '🧾' },
  { to: '/admin/staff?role=CHEF', title: 'Chef Management', text: 'View and manage CHEF staff accounts.', icon: '👨‍🍳' },
  { to: '/admin/staff?role=DELIVERY', title: 'Delivery Management', text: 'View and manage DELIVERY staff accounts.', icon: '🛵' },
  { to: '/admin/staff', title: 'All Staff', text: 'Combined CHEF + DELIVERY staff overview.', icon: '👔' },
  { to: '/admin/analytics', title: 'Analytics', text: 'Delivered-only sales totals and per-product units.', icon: '📊' },
];

function metaTotal(res) {
  const m = res?.meta || res?.data?.meta;
  return typeof m?.total === 'number' ? m.total : null;
}

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const [stats, setStats] = useState({ users: null, revenue: null, orders: null, delivery: null });
  const [chart, setChart] = useState([]);
  const [chartLoaded, setChartLoaded] = useState(false);

  // Best-effort stats from EXISTING admin endpoints only (limit=1 keeps the
  // payload tiny; meta.total is the count). Failures leave "—", never break.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [u, p, o, d, a] = await Promise.all([
          api.adminUsers({ limit: 1 }).catch(() => null),
          api.adminProducts({ limit: 1 }).catch(() => null),
          api.adminOrders({ limit: 1 }).catch(() => null),
          api.adminStaff({ role: 'DELIVERY', limit: 1 }).catch(() => null),
          api.adminAnalytics().catch(() => null),
        ]);
        if (!alive) return;
        const analytics = a?.data?.analytics || a?.data || null;
        const revenue = analytics?.sales ? Number(analytics.sales.year ?? analytics.sales.month ?? 0) : null;
        setStats({
          users: metaTotal(u),
          revenue,
          orders: metaTotal(o),
          delivery: metaTotal(d),
        });
        void p;
        const byProduct = Array.isArray(analytics?.byProduct) ? analytics.byProduct.slice(0, 7) : [];
        setChart(byProduct.map((r) => Number(r.unitsSold ?? 0)));
        setChartLoaded(true);
      } catch {
        // stats are decorative; section links below always render
        if (alive) setChartLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const maxBar = Math.max(1, ...chart);
  const weekSales = stats.revenue !== null ? stats.revenue : null;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Admin navigation">
        <div className={styles.sideBrand}>
          <span className={styles.sideBrandMark} aria-hidden="true">J</span>
          Joo food
        </div>
        <nav className={styles.sideNav}>
          <Link to="/admin" className={`${styles.sideLink} ${styles.sideLinkActive}`}>📊 Dashboard</Link>
          <Link to="/admin/users" className={styles.sideLink}>👥 Users</Link>
          <Link to="/admin/products" className={styles.sideLink}>🍕 Products</Link>
          <Link to="/admin/orders" className={styles.sideLink}>🧾 Orders</Link>
          <Link to="/admin/staff?role=CHEF" className={styles.sideLink}>👨‍🍳 Chef Management</Link>
          <Link to="/admin/staff?role=DELIVERY" className={styles.sideLink}>🛵 Delivery Management</Link>
          <Link to="/admin/staff" className={styles.sideLink}>👔 All Staff</Link>
          <Link to="/admin/analytics" className={styles.sideLink}>📈 Analytics</Link>
        </nav>
        {/* Admin logout lives on the dashboard (no shared top navbar here). */}
        <button type="button" className={styles.sideLogout} onClick={logout}>↩ Logout</button>
      </aside>
      <main className={styles.main}>
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

        <div className={styles.stats} aria-label="Overview statistics">
          <div className={styles.statCard}>
            <p className={styles.statLabel}>👥 Users</p>
            <p className={styles.statValue}>{stats.users ?? '—'}</p>
            <p className={styles.statHint}>View all customers</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>💰 Total revenue</p>
            <p className={styles.statValue}>{stats.revenue !== null ? `$${Number(stats.revenue).toLocaleString()}` : '—'}</p>
            <p className={styles.statHint}>Delivered orders only</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>🧾 Total orders</p>
            <p className={styles.statValue}>{stats.orders ?? '—'}</p>
            <p className={styles.statHint}>All statuses</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>🛵 Delivery staff</p>
            <p className={styles.statValue}>{stats.delivery ?? '—'}</p>
            <p className={styles.statHint}>Active couriers</p>
          </div>
        </div>

        <div className={styles.grid}>
          {SECTIONS.map((s) => (
            <Link key={s.title} to={s.to} className={styles.card}>
              <span className={styles.cardIcon} aria-hidden="true">{s.icon}</span>
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
          <div className={styles.card} aria-label="Sales chart">
            <span className={styles.cardIcon} aria-hidden="true">📈</span>
            <h2 className={styles.cardTitle}>Sales this week</h2>
            <p className={styles.cardText}>{weekSales !== null ? `$${Number(weekSales).toLocaleString()} delivered total` : 'Delivered-only sales'}</p>
            <div className={styles.chart} aria-hidden="true">
              {/* Neutral skeleton until analytics resolves: orange bars mount
               * once with final heights, so nothing flashes/swaps on the
               * right side when switching views. Same data, same fetch. */}
              {!chartLoaded &&
                [42, 68, 55, 80, 62, 90, 74].map((v, i) => (
                  <span key={i} className={styles.barSkeleton} style={{ height: `${v}%` }} />
                ))}
              {chartLoaded &&
                chart.length > 0 &&
                chart.map((v, i) => (
                  <span key={i} className={styles.bar} style={{ height: `${Math.max(10, Math.round((v / maxBar) * 100))}%` }} />
                ))}
              {chartLoaded && chart.length === 0 && (
                <span className={styles.sectionSub} style={{ alignSelf: 'center' }}>No sales yet</span>
              )}
            </div>
            <Link
              to="/admin/analytics"
              className={styles.cardCta}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                background: '#111827',
                color: '#fff',
                borderRadius: 8,
                padding: '10px 14px',
                textDecoration: 'none',
              }}
            >
              Open →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
