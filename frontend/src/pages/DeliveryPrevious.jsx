import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import dash from './RoleDashboard.module.css';

function listOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.orders)) return d.orders;
  return [];
}

export default function DeliveryPrevious() {
  const { logout, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .deliveryPrevious({ page: 1, limit: 20 })
      .then((res) => setOrders(listOf(res)))
      .catch((err) => setError(err.message));
  }, []);

  // Read-only history details from the backend history shape:
  // customerName, products, itemCount, total, deliveredAt. Display-only.
  function orderDetails(o) {
    return (
      <>
        <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="muted">Customer</span>
            <strong>{o.customerName || '—'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="muted">Items</span>
            <strong>{o.itemCount ?? (Array.isArray(o.products) ? o.products.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) : '—')}</strong>
          </div>
          {o.address && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className="muted">Address</span>
              <strong>{[o.address.address, o.address.buildingNumber, o.address.apartmentNumber, o.address.streetName].filter(Boolean).join(', ') || '—'}</strong>
            </div>
          )}
          {o.address && o.address.otherDetails && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className="muted">Other Details</span>
              <strong>{o.address.otherDetails}</strong>
            </div>
          )}
          {o.createdAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className="muted">Placed</span>
              <strong>{new Date(o.createdAt).toLocaleString()}</strong>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="muted">Delivered</span>
            <strong>{o.deliveredAt ? new Date(o.deliveredAt).toLocaleString() : '—'}</strong>
          </div>
        </div>
        {Array.isArray(o.products) && o.products.length > 0 && (
          <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {o.products.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                <span>{it.productName} × {it.quantity}</span>
                {(it.unitPrice !== undefined || it.subtotal !== undefined) && (
                  <span className="muted">${Number(it.unitPrice ?? 0).toFixed(2)} each · ${Number(it.subtotal ?? 0).toFixed(2)}</span>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>Total</span>
            <strong>${Number(o.total ?? 0).toFixed(2)}</strong>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={dash.shell}>
      <aside className={dash.sidebar} aria-label="Delivery navigation">
        <div className={dash.brand}>
          <span className={dash.brandMark} aria-hidden="true">J</span>
          Joo food
        </div>
        <nav className={dash.nav}>
          <Link to="/delivery/current" className={dash.navLink}>Orders</Link>
          <Link to="/delivery/previous" className={`${dash.navLink} ${dash.navLinkActive}`}>History</Link>
        </nav>
        <button type="button" className={dash.logoutBtn} onClick={logout}>Logout</button>
      </aside>
      <main className={dash.main}>
        <div className={dash.topbar}>
          <div>
            <h1 className={dash.title}>Delivery Dashboard</h1>
            <p className={dash.sub}>Previous deliveries (read-only).</p>
          </div>
          <div className={dash.userChip}>
            <span className={dash.userName}>{user?.username || 'delivery'}</span>
            <button type="button" className={dash.topLogout} onClick={logout}>Logout</button>
          </div>
        </div>
        {error && <p className={dash.error} role="alert">{error}</p>}
        <section aria-label="Previous deliveries">
          <h2 className={dash.columnTitle}>History <span className={dash.countBadge}>{orders.length}</span></h2>
          {orders.length === 0 && !error && <div className={dash.emptyCard}>No delivered orders yet.</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {orders.map((o) => (
              <article key={o.id} className={dash.orderCard} style={{ marginBottom: 0 }}>
                <div className={dash.orderHead}>
                  <div>
                    <h3 className={dash.orderId}>Order #{o.id}</h3>
                    <p className={dash.orderMeta}>{o.customerName || ''}</p>
                  </div>
                  <span className={`${dash.pill} ${dash.pillReady}`}>{o.statusLabel || o.status}</span>
                </div>
                {orderDetails(o)}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
