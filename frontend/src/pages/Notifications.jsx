import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiFetch } from '../api/client.js';
import bellStyles from '../components/NotificationBell.module.css';
import sf from './Storefront.module.css';

// Full-page notifications inbox reusing the dropdown's visual language
// (header + tabs + TODAY/EARLIER). Additive page; existing pages untouched.

function timeAgo(iso) {
  try {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return '';
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return 'Just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hr ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return '';
  }
}

function isToday(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  } catch {
    return true;
  }
}

// Professional line-icon for each notification kind (replaces the former
// emoji glyphs). Same pastel tile backgrounds as before; no logic changed.
function NotifGlyph({ kind }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (kind === 'login')
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
      </svg>
    );
  if (kind === 'register')
    return (
      <svg {...common}>
        <path d="M4 9h16v4H4z" />
        <path d="M6 13v7h12v-7" />
        <path d="M12 9v11" />
      </svg>
    );
  if (kind === 'placed')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.5 2.5 4.5-5.5" />
      </svg>
    );
  if (kind === 'preparing')
    return (
      <svg {...common}>
        <path d="M7 11a3.5 3.5 0 1 1 .6-6.9A4.5 4.5 0 0 1 12 3a4.5 4.5 0 0 1 4.4 1.1A3.5 3.5 0 1 1 17 11H7Z" />
        <path d="M8.5 14v5h7v-5" />
      </svg>
    );
  if (kind === 'ready')
    return (
      <svg {...common}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
      </svg>
    );
  if (kind === 'way')
    return (
      <svg {...common}>
        <path d="M2.5 6h12v10h-12z" />
        <path d="M14.5 10h4l3 3.5V16h-7" />
        <circle cx="7" cy="18" r="1.8" />
        <circle cx="17" cy="18" r="1.8" />
      </svg>
    );
  if (kind === 'delivered')
    return (
      <svg {...common}>
        <path d="m4 11 8-7 8 7" />
        <path d="M6 9.5V20h12V9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function iconFor(n) {
  const type = String(n?.type || '');
  if (type === 'AUTH_LOGIN') return { bg: '#f5f3ff', color: '#7c3aed', kind: 'login' };
  if (type === 'AUTH_REGISTER') return { bg: '#ecfdf5', color: '#059669', kind: 'register' };
  if (type === 'ORDER_PLACED') return { bg: '#ecfdf5', color: '#059669', kind: 'placed' };
  const title = String(n?.title || '');
  if (/prepar/i.test(title)) return { bg: '#fff7ed', color: '#ea580c', kind: 'preparing' };
  if (/ready for delivery/i.test(title)) return { bg: '#fff7ed', color: '#d97706', kind: 'ready' };
  if (/on the way|out for delivery/i.test(title)) return { bg: '#eff6ff', color: '#0284c7', kind: 'way' };
  if (/deliver/i.test(title)) return { bg: '#ecfdf5', color: '#059669', kind: 'delivered' };
  return { bg: '#faf5ee', color: '#78716c', kind: 'default' };
}

export default function Notifications() {
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.notifications({ filter: tab === 'all' ? 'all' : tab, page: 1, limit: 50 });
      const data = res?.data || {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(Number(data.unreadCount) || 0);
    } catch (err) {
      // Fallback: still show order-derived rows (same mapping as the bell).
      // silent:true: background probe, never the global toast (page shows its
      // own inline error below when both sources fail).
      try {
        const res = await apiFetch('/orders?page=1&limit=20', { auth: true, skipAuthRedirect: true, silent: true });
        const d = res?.data;
        const orders = Array.isArray(d) ? d : d?.items || [];
        const read = new Set(JSON.parse(localStorage.getItem('fp_notif_read') || '[]'));
        const fb = orders.map((o) => ({
          id: `order-${o.id}-${o.status}`,
          type: 'ORDER_STATUS',
          title: o.status === 'PENDING' ? 'Order placed successfully' : `Order #${o.id} ${String(o.statusLabel || o.status).toLowerCase()}`,
          body: `Order #${o.id} · total $${Number(o.total ?? 0).toFixed(2)}.`,
          orderId: o.id,
          isRead: read.has(`order-${o.id}-${o.status}`),
          createdAt: o.updatedAt || o.createdAt,
        }));
        const vis = tab === 'unread' ? fb.filter((n) => !n.isRead) : fb;
        setItems(vis);
        setUnreadCount(fb.filter((n) => !n.isRead).length);
      } catch {
        setError(err.message);
      }
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function markAll() {
    try {
      await api.notificationsMarkAllRead();
    } catch { /* best-effort */ }
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function markOne(n) {
    try {
      if (!n._fallback && typeof n.id === 'number') await api.notificationsMarkRead(n.id);
    } catch { /* best-effort */ }
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    setUnreadCount((c) => Math.max(0, c - (n.isRead ? 0 : 1)));
  }

  const today = items.filter((n) => isToday(n.createdAt));
  const earlier = items.filter((n) => !isToday(n.createdAt));

  return (
    <div className={sf.page}>
      <div className={bellStyles.panelHead} style={{ padding: '4px 4px 6px' }}>
        <h2 className={sf.sectionTitle} style={{ fontSize: 24, margin: 0 }}>
          Notifications
        </h2>
        {unreadCount > 0 && <span className={bellStyles.newPill}>{unreadCount} new</span>}
        <button type="button" className={bellStyles.markAll} onClick={markAll}>
          Mark all as read
        </button>
      </div>
      <div className={bellStyles.tabs} role="tablist" aria-label="Notification filter">
        <button type="button" role="tab" aria-selected={tab === 'all'} className={`${bellStyles.tab} ${tab === 'all' ? bellStyles.tabActive : ''}`} onClick={() => setTab('all')}>
          All
        </button>
        <button type="button" role="tab" aria-selected={tab === 'unread'} className={`${bellStyles.tab} ${tab === 'unread' ? bellStyles.tabActive : ''}`} onClick={() => setTab('unread')}>
          Unread ({unreadCount})
        </button>
        <button type="button" role="tab" aria-selected={tab === 'orders'} className={`${bellStyles.tab} ${tab === 'orders' ? bellStyles.tabActive : ''}`} onClick={() => setTab('orders')}>
          Orders
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {items.length === 0 && !error && <p className="muted">You&apos;re all caught up.</p>}
      {today.length > 0 && <div className={bellStyles.sectionLabel}>Today</div>}
      {today.map((n) => {
        const ic = iconFor(n);
        return (
          <div key={n.id} className={`${bellStyles.item} ${!n.isRead ? bellStyles.itemUnread : ''}`} style={{ cursor: 'default' }}>
            <span className={bellStyles.itemIcon} style={{ background: ic.bg, color: ic.color }} aria-hidden="true"><NotifGlyph kind={ic.kind} /></span>
            <span className={bellStyles.itemBody}>
              <span className={bellStyles.itemTitle}>
                {!n.isRead && <span className={bellStyles.unreadDot} aria-hidden="true" />}
                {n.orderId ? <Link to={`/orders/${n.orderId}`} style={{ color: 'inherit' }}>{n.title}</Link> : n.title}
              </span>
              {n.body && <p className={bellStyles.itemText}>{n.body}</p>}
              <span className={bellStyles.itemTime}>{timeAgo(n.createdAt)}</span>
              {!n.isRead && (
                <button type="button" className={bellStyles.markAll} onClick={() => markOne(n)}>
                  Mark as read
                </button>
              )}
            </span>
          </div>
        );
      })}
      {earlier.length > 0 && <div className={bellStyles.sectionLabel}>Earlier</div>}
      {earlier.map((n) => {
        const ic = iconFor(n);
        return (
          <div key={n.id} className={`${bellStyles.item} ${!n.isRead ? bellStyles.itemUnread : ''}`} style={{ cursor: 'default' }}>
            <span className={bellStyles.itemIcon} style={{ background: ic.bg, color: ic.color }} aria-hidden="true"><NotifGlyph kind={ic.kind} /></span>
            <span className={bellStyles.itemBody}>
              <span className={bellStyles.itemTitle}>
                {!n.isRead && <span className={bellStyles.unreadDot} aria-hidden="true" />}
                {n.orderId ? <Link to={`/orders/${n.orderId}`} style={{ color: 'inherit' }}>{n.title}</Link> : n.title}
              </span>
              {n.body && <p className={bellStyles.itemText}>{n.body}</p>}
              <span className={bellStyles.itemTime}>{timeAgo(n.createdAt)}</span>
              {!n.isRead && (
                <button type="button" className={bellStyles.markAll} onClick={() => markOne(n)}>
                  Mark as read
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
