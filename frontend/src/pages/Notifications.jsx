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

function iconFor(n) {
  const type = String(n?.type || '');
  if (type === 'AUTH_LOGIN') return { bg: '#f5f3ff', glyph: '👋' };
  if (type === 'AUTH_REGISTER') return { bg: '#ecfdf5', glyph: '🎉' };
  if (type === 'ORDER_PLACED') return { bg: '#ecfdf5', glyph: '✅' };
  const title = String(n?.title || '');
  if (/prepar/i.test(title)) return { bg: '#fff7ed', glyph: '👨‍🍳' };
  if (/ready for delivery/i.test(title)) return { bg: '#fff7ed', glyph: '📦' };
  if (/on the way|out for delivery/i.test(title)) return { bg: '#eff6ff', glyph: '🛵' };
  if (/deliver/i.test(title)) return { bg: '#ecfdf5', glyph: '🏠' };
  return { bg: '#faf5ee', glyph: '🔔' };
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
            <span className={bellStyles.itemIcon} style={{ background: ic.bg }} aria-hidden="true">{ic.glyph}</span>
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
            <span className={bellStyles.itemIcon} style={{ background: ic.bg }} aria-hidden="true">{ic.glyph}</span>
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
