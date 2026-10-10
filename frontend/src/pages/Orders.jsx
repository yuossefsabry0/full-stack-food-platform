import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import sf from './Storefront.module.css';

function unwrapList(res) {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.orders)) return data.orders;
  return [];
}

// Progress position derived only from the real backend statuses
// (PENDING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED).
const STEPS = ['Placed', 'Preparing', 'On the way', 'Delivered'];

function stepIndex(status) {
  switch (status) {
    case 'READY_FOR_DELIVERY':
      return 1;
    case 'OUT_FOR_DELIVERY':
      return 2;
    case 'DELIVERED':
      return 3;
    default:
      return 0;
  }
}

const TABS = ['All', 'Active', 'Delivered'];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .orders({ page: 1, limit: 20 })
      .then((res) => setOrders(unwrapList(res)))
      .catch((err) => setError(err.message));
  }, []);

  const visible =
    tab === 'Delivered' ? orders.filter((o) => o.status === 'DELIVERED') : tab === 'Active' ? orders.filter((o) => o.status !== 'DELIVERED') : orders;

  return (
    <div className={sf.page}>
      <span className={sf.pageLabel}>
        <span className={sf.pageLabelDot} aria-hidden="true" />
        My Orders Page
      </span>
      <h2 className={sf.sectionTitle} style={{ fontSize: 28, margin: '12px 0 4px' }}>
        My Orders
      </h2>
      <p className={sf.sectionSub}>Follow every order from confirmation to delivery.</p>

      <div className={sf.tabs} role="tablist" aria-label="Order status filter">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`${sf.tab} ${tab === t ? sf.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {visible.length === 0 && !error && tab === 'All' && (
        <>
          <div className={sf.emptyWrap}>
            <div className={sf.emptyRing} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12v18H6z" />
                <path d="M9 8h6M9 12h6M9 16h3.5" />
              </svg>
              <span className={sf.emptySpark} style={{ left: 16, top: 24, color: '#ea580c' }}>✦</span>
              <span className={sf.emptySpark} style={{ right: 18, bottom: 22, color: '#fbbf24' }}>★</span>
            </div>
            <h3 className={sf.emptyTitle}>No orders yet</h3>
            <p className={sf.emptyText}>
              When you place your first order, you&apos;ll be able to track it and see your order history here.
            </p>
            <div className={sf.emptyCtas}>
              <Link className={sf.ctaPrimary} to="/menu">
                Order now
              </Link>
            </div>
          </div>
          <h3 className={sf.sectionTitle} style={{ fontSize: 17, margin: '20px 0 0' }}>
            How it works
          </h3>
          <div className={sf.howGrid}>
            <div className={sf.howCard}>
              <span className={sf.howNum} aria-hidden="true">1</span>
              <h4>Pick your meal</h4>
              <p>Browse the menu and add dishes to your cart.</p>
            </div>
            <div className={sf.howCard}>
              <span className={sf.howNum} aria-hidden="true">2</span>
              <h4>Checkout</h4>
              <p>Confirm your address and place the order.</p>
            </div>
            <div className={sf.howCard}>
              <span className={sf.howNum} aria-hidden="true">3</span>
              <h4>Track it live</h4>
              <p>Follow the status until it reaches your door.</p>
            </div>
          </div>
        </>
      )}
      {visible.length === 0 && !error && tab !== 'All' && (
        <div className={sf.orderCard}>
          <p className="muted" style={{ margin: 0 }}>No {tab.toLowerCase()} orders.</p>
        </div>
      )}
      {visible.map((o) => {
        const done = stepIndex(o.status);
        const delivered = o.status === 'DELIVERED';
        const count = Array.isArray(o.items) ? o.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) : '—';
        return (
          <div className={sf.orderCard} key={o.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <Link to={`/orders/${o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong style={{ fontSize: 16 }}>Order #{o.id}</strong>
              </Link>
              <span className={`${sf.statusPill} ${delivered ? sf.statusDone : sf.statusActive}`}>
                {o.statusLabel || o.status}
              </span>
            </div>
            <ol className={sf.progress} aria-label={`Progress for order ${o.id}`}>
              {STEPS.map((s, i) => (
                <li key={s} className={`${sf.progressStep} ${i <= done ? sf.progressDone : ''}`} aria-current={i === done ? 'step' : undefined}>
                  {s}
                </li>
              ))}
            </ol>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14, marginTop: 8 }}>
              <span className="muted">
                {count} item(s) · {o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}
              </span>
              <strong>${Number(o.total ?? 0).toFixed(2)}</strong>
            </div>
            <Link
              to={`/orders/${o.id}`}
              className={sf.ctaGhost}
              style={{ width: '100%', marginTop: 10, textDecoration: 'none' }}
            >
              View Details
            </Link>
          </div>
        );
      })}
    </div>
  );
}
