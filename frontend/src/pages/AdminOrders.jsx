import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import AdminShell from '../components/AdminShell.jsx';
import styles from './AdminDashboard.module.css';

function listOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.orders)) return d.orders;
  return [];
}

function metaOf(res) {
  const m = res?.meta || res?.data?.meta;
  return {
    total: typeof m?.total === 'number' ? m.total : 0,
    totalPages: typeof m?.totalPages === 'number' ? m.totalPages : 0,
  };
}

// Display-only short status for table pills (data itself is untouched;
// the full API status label stays in the row's title attribute).
function shortStatus(status) {
  return String(status || '')
    .toLowerCase()
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function statusPillClass(status) {
  if (status === 'DELIVERED') return 'pillActive';
  if (status === 'PENDING') return 'pillInfo';
  if (status === 'OUT_FOR_DELIVERY') return 'pillBlue';
  return 'pillNeutral';
}

function itemCount(o) {
  return Array.isArray(o.items) ? o.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) : 0;
}

const PAGE_SIZE = 7;
const STATUSES = ['PENDING', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [error, setError] = useState('');
  // Presentational-only table controls (search filters the loaded page;
  // status/sort/page reload through the existing admin-orders endpoint).
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  async function load(s = '', pageNum = 1, sortKey = 'newest') {
    setError('');
    try {
      const res = await api.adminOrders({
        page: pageNum,
        limit: PAGE_SIZE,
        status: s || undefined,
        sortBy: 'createdAt',
        sortOrder: sortKey === 'oldest' ? 'asc' : 'desc',
      });
      setOrders(listOf(res));
      setMeta(metaOf(res));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load(status, page, sort);
  }, [status, page, sort]);

  // Per-status counts for the filter pills (existing list endpoint with
  // limit=1 — same cheap meta.total pattern as the admin dashboard stats).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await api.adminOrders({ page: 1, limit: 1 }).catch(() => null);
        const per = await Promise.all(
          STATUSES.map((st) => api.adminOrders({ page: 1, limit: 1, status: st }).catch(() => null))
        );
        if (!alive) return;
        setCounts({
          all: metaOf(all).total,
          ...Object.fromEntries(STATUSES.map((st, i) => [st, metaOf(per[i]).total])),
        });
      } catch {
        // counts are decorative; the table below always renders
      }
    })();
    return () => {
      alive = false;
    };
  }, [status]);

  function pickStatus(value) {
    setPage(1);
    setExpandedId(null);
    setParams(value ? { status: value } : {});
  }

  const q = query.trim().toLowerCase();
  const visible = orders.filter((o) => {
    if (!q) return true;
    if (String(o.id) === q.replace(/^#/, '')) return true;
    return (o.address?.name || '').toLowerCase().includes(q);
  });

  const pages = [];
  for (let i = 1; i <= Math.min(meta.totalPages || 0, 25); i += 1) pages.push(i);

  return (
    <AdminShell active="orders" title="Orders" sub="All current orders with status filters and sorting.">
        <p className={styles.crumb}>
          <span>Dashboard</span>
          <span aria-hidden="true"> / </span>
          <span>Orders</span>
        </p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className={styles.ordersBar}>
          <input
            className={`input ${styles.searchInput}`}
            type="search"
            placeholder="Search order # or customer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search orders by number or customer"
          />
          <label className={styles.sortWrap}>
            <span className="muted" style={{ fontSize: 13 }}>Sort:</span>
            <select
              className={`input ${styles.sortSelect}`}
              value={sort}
              onChange={(e) => { setPage(1); setSort(e.target.value); }}
              aria-label="Sort orders"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </label>
        </div>
        <div className={styles.toolbar} role="toolbar" aria-label="Filter orders by status">
          <button
            type="button"
            className={`${styles.filterBtn} ${status === '' ? styles.filterBtnActive : ''}`}
            onClick={() => pickStatus('')}
            aria-pressed={status === ''}
          >
            All{counts ? ` (${counts.all})` : ''}
          </button>
          {STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              className={`${styles.filterBtn} ${status === st ? styles.filterBtnActive : ''}`}
              onClick={() => pickStatus(st)}
              aria-pressed={status === st}
            >
              {shortStatus(st)}{counts ? ` (${counts[st] ?? '—'})` : ''}
            </button>
          ))}
        </div>
        <div className={styles.tableCard}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Placed</th>
                <th>Status</th>
                <th><span className={styles.srOnly}>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <React.Fragment key={o.id}>
                  <tr>
                    <td><strong>#{o.id}</strong></td>
                    <td>{o.address?.name || '—'}</td>
                    <td>{itemCount(o)} product{itemCount(o) === 1 ? '' : 's'}</td>
                    <td><strong>${Number(o.total ?? 0).toFixed(2)}</strong></td>
                    <td title={o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}>
                      {o.createdAt
                        ? new Date(o.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>
                      <span
                        className={`${styles.pill} ${styles[statusPillClass(o.status)] || ''}`}
                        title={o.statusLabel || o.status}
                      >
                        {shortStatus(o.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.viewLink}
                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                        aria-expanded={expandedId === o.id}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                  {expandedId === o.id && (
                    <tr className={styles.detailRow}>
                      <td colSpan={7}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                          {(o.items || []).map((it, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                              <span>{it.productName} × {it.quantity}</span>
                              <strong>${Number(it.lineTotal ?? it.subtotal ?? 0).toFixed(2)}</strong>
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            <span className="muted">Courier</span>
                            <strong>{o.deliveryId ? `#${o.deliveryId}` : '—'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            <span className="muted">Chef</span>
                            <strong>{o.chefId ? `#${o.chefId}` : '—'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            <span className="muted">Placed</span>
                            <strong>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</strong>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && !error && <p className="muted">No orders match this filter. Try clearing the status.</p>}
        </div>
        <div className={styles.pager}>
          <span className="muted" style={{ fontSize: 13 }}>
            Showing {visible.length} of {meta.total} orders
          </span>
          <div className={styles.pageBtns}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="Previous page"
            >
              ‹
            </button>
            {pages.map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                onClick={() => setPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className={styles.pageBtn}
              disabled={meta.totalPages ? page >= meta.totalPages : true}
              onClick={() => setPage(page + 1)}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
    </AdminShell>
  );
}
