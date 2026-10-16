import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, apiFetch } from '../api/client.js';
import styles from './NotificationBell.module.css';

// Bell icon with two states (Image 1): Default = plain bell (no unread),
// New = small dot (unread exists, no count number). Dropdown panel matches
// Image 2: header + tabs + TODAY/EARLIER groups + footer link.
// Additive component: existing navbar/logic untouched; backend is the source
// of truth with an orders-derived fallback so the bell still works if the
// notifications table/endpoint is unavailable.

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
    if (d === 1) return 'Yesterday';
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

function fallbackFromOrders(orders) {
  const read = new Set(JSON.parse(localStorage.getItem('fp_notif_read') || '[]'));
  return (orders || []).slice(0, 20).map((o) => {
    let title = `Order #${o.id} updated`;
    let body = o.statusLabel || o.status;
    if (o.status === 'PENDING') {
      title = 'Order placed successfully';
      body = `We received order #${o.id} · total $${Number(o.total ?? 0).toFixed(2)}.`;
    } else if (o.status === 'PREPARING') {
      title = 'Your order is being prepared';
      body = `The chef received order #${o.id} and started cooking.`;
    } else if (o.status === 'READY_FOR_DELIVERY') {
      title = `Order #${o.id} is ready for delivery`;
      body = 'Your order is packed and waiting for a courier.';
    } else if (o.status === 'OUT_FOR_DELIVERY') {
      title = `Order #${o.id} is on the way`;
      body = 'The courier is delivering your order.';
    } else if (o.status === 'DELIVERED') {
      title = `Order #${o.id} delivered`;
      body = 'Enjoy your meal! Rate your experience.';
    }
    const key = `order-${o.id}-${o.status}`;
    return {
      id: key,
      type: 'ORDER_STATUS',
      title,
      body,
      orderId: o.id,
      isRead: read.has(key),
      createdAt: o.updatedAt || o.createdAt || new Date().toISOString(),
      _fallback: true,
    };
  });
}

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all'); // all | unread | orders
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.notifications({ filter: 'all', page: 1, limit: 20 });
      const data = res?.data || {};
      const list = Array.isArray(data.items) ? data.items : [];
      if (list.length > 0 || (res && res.success !== false)) {
        setItems(list);
        setUnreadCount(Number(data.unreadCount) || list.filter((n) => !n.isRead).length);
        return;
      }
      throw new Error('empty');
    } catch {
      // Fallback: derive order-status notifications so the bell/panel still
      // reflect placements + status changes when the endpoint is unavailable.
      // silent:true: this background probe must never fire the global toast.
      try {
        const res = await apiFetch('/orders?page=1&limit=20', { auth: true, skipAuthRedirect: true, silent: true });
        const d = res?.data;
        const orders = Array.isArray(d) ? d : d?.items || [];
        const fb = fallbackFromOrders(orders);
        setItems(fb);
        setUnreadCount(fb.filter((n) => !n.isRead).length);
      } catch {
        setItems([]);
        setUnreadCount(0);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    const onRefresh = () => load();
    window.addEventListener('fp:notifications-refresh', onRefresh);
    return () => {
      clearInterval(id);
      window.removeEventListener('fp:notifications-refresh', onRefresh);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  async function markAll() {
    try {
      await api.notificationsMarkAllRead();
    } catch {
      // fallback: persist reads locally
      try {
        const ids = items.map((n) => n.id);
        localStorage.setItem('fp_notif_read', JSON.stringify(ids));
      } catch { /* ignore */ }
    }
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function openItem(n) {
    try {
      if (!n.isRead && !n._fallback) await api.notificationsMarkRead(n.id);
      if (!n.isRead && n._fallback) {
        const read = new Set(JSON.parse(localStorage.getItem('fp_notif_read') || '[]'));
        read.add(n.id);
        localStorage.setItem('fp_notif_read', JSON.stringify([...read]));
      }
    } catch { /* best-effort */ }
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    setUnreadCount((c) => Math.max(0, c - (n.isRead ? 0 : 1)));
    setOpen(false);
    if (n.orderId) navigate(`/orders/${n.orderId}`);
    else navigate('/notifications');
  }

  const hasUnread = unreadCount > 0;
  const visible =
    tab === 'unread' ? items.filter((n) => !n.isRead) : tab === 'orders' ? items.filter((n) => n.orderId || String(n.type || '').startsWith('ORDER_')) : items;
  const today = visible.filter((n) => isToday(n.createdAt));
  const earlier = visible.filter((n) => !isToday(n.createdAt));

  function renderRow(n) {
    const ic = iconFor(n);
    return (
      <button key={n.id} type="button" className={`${styles.item} ${!n.isRead ? styles.itemUnread : ''}`} onClick={() => openItem(n)}>
        <span className={styles.itemIcon} style={{ background: ic.bg, color: ic.color }} aria-hidden="true">
          <NotifGlyph kind={ic.kind} />
        </span>
        <span className={styles.itemBody}>
          <span className={styles.itemTitle}>
            {!n.isRead && <span className={styles.unreadDot} aria-hidden="true" />}
            {n.title}
          </span>
          {n.body && <p className={styles.itemText}>{n.body}</p>}
          <span className={styles.itemTime}>{timeAgo(n.createdAt)}</span>
        </span>
      </button>
    );
  }

  return (
    <div className={styles.bellWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.bellBtn}
        aria-label={hasUnread ? 'Notifications, unread' : 'Notifications, no new notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!isAuthenticated) {
            navigate('/login');
            return;
          }
          setOpen((v) => !v);
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {hasUnread && <span className={styles.bellDot} aria-hidden="true" />}
      </button>
      {open && isAuthenticated && (
        <div className={styles.panel} role="dialog" aria-label="Notifications">
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Notifications</span>
            {hasUnread && <span className={styles.newPill}>{unreadCount} new</span>}
            <button type="button" className={styles.markAll} onClick={markAll}>
              Mark all as read
            </button>
          </div>
          <div className={styles.tabs} role="tablist" aria-label="Notification filter">
            <button type="button" role="tab" aria-selected={tab === 'all'} className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`} onClick={() => setTab('all')}>
              All
            </button>
            <button type="button" role="tab" aria-selected={tab === 'unread'} className={`${styles.tab} ${tab === 'unread' ? styles.tabActive : ''}`} onClick={() => setTab('unread')}>
              Unread ({unreadCount})
            </button>
            <button type="button" role="tab" aria-selected={tab === 'orders'} className={`${styles.tab} ${tab === 'orders' ? styles.tabActive : ''}`} onClick={() => setTab('orders')}>
              Orders
            </button>
          </div>
          {visible.length === 0 ? (
            <p className={styles.empty}>You&apos;re all caught up. New orders and updates will appear here.</p>
          ) : (
            <>
              {today.length > 0 && (
                <>
                  <div className={styles.sectionLabel}>Today</div>
                  {today.map(renderRow)}
                </>
              )}
              {earlier.length > 0 && (
                <>
                  <div className={styles.sectionLabel}>Earlier</div>
                  {earlier.map(renderRow)}
                </>
              )}
            </>
          )}
          <Link className={styles.panelFoot} to="/notifications" onClick={() => setOpen(false)}>
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

// Helper for other pages to request a bell refresh after user actions
// (login / checkout). Dispatch only; never throws.
export function refreshNotifications() {
  try {
    window.dispatchEvent(new CustomEvent('fp:notifications-refresh'));
  } catch { /* ignore */ }
}
