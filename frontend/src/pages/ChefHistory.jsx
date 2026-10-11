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

export default function ChefHistory() {
  const { logout, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .chefHistory({ page: 1, limit: 20 })
      .then((res) => setOrders(listOf(res)))
      .catch((err) => setError(err.message));
  }, []);

  // Read-only order details, same fields/shape as the requests route:
  // items, totals, address, dates. Display-only.
  function orderDetails(o) {
    return (
      <>
        <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="muted">Items</span>
            <strong>{Array.isArray(o.items) ? o.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) : '—'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="muted">Placed</span>
            <strong>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</strong>
          </div>
        </div>
        {Array.isArray(o.items) && o.items.length > 0 && (
          <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {o.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                <span>{it.productName} × {it.quantity}</span>
                <strong>${Number(it.subtotal ?? it.lineTotal ?? 0).toFixed(2)}</strong>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="muted">Products total</span>
            <strong>${Number(o.productsTotal ?? o.subtotal ?? 0).toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="muted">Delivery fee</span>
            <strong>${Number(o.deliveryFee ?? 0).toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>Total</span>
            <strong>${Number(o.total ?? 0).toFixed(2)}</strong>
          </div>
        </div>
        {o.address && (
          <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, fontSize: 14 }}>
            <span className="muted">Deliver to: </span>
            <strong>
              {o.address.name}, {o.address.address}, Bldg {o.address.buildingNumber},
              Apt {o.address.apartmentNumber}, {o.address.streetName} · {o.address.phoneNumber}
            </strong>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={dash.shell}>
      <aside className={dash.sidebar} aria-label="Chef navigation">
        <div className={dash.brand}>
          <span className={dash.brandMark} aria-hidden="true">J</span>
          Joo food
        </div>
        <nav className={dash.nav}>
          <Link to="/chef/requests" className={dash.navLink}>🧾 Orders</Link>
          <Link to="/chef/history" className={`${dash.navLink} ${dash.navLinkActive}`}>🕘 History</Link>
        </nav>
        <button type="button" className={dash.logoutBtn} onClick={logout}>↩ Logout</button>
      </aside>
      <main className={dash.main}>
        <div className={dash.topbar}>
          <div>
            <h1 className={dash.title}>Chef Dashboard</h1>
            <p className={dash.sub}>Prepared orders (read-only history).</p>
          </div>
          <div className={dash.userChip}>
            <span className={dash.userName}>🧑‍🍳 {user?.username || 'chef'}</span>
            <button type="button" className={dash.topLogout} onClick={logout}>Logout</button>
          </div>
        </div>
        {error && <p className={dash.error} role="alert">{error}</p>}
        <div className={dash.columns} style={{ gridTemplateColumns: '1fr 1fr' }}>
          <section aria-label="Prepared orders" style={{ gridColumn: '1 / -1' }}>
            <h2 className={dash.columnTitle}>📦 History <span className={dash.countBadge}>{orders.length}</span></h2>
            {orders.length === 0 && !error && <div className={dash.emptyCard}>No prepared orders yet.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {orders.map((o) => (
                <article key={o.id} className={dash.orderCard} style={{ marginBottom: 0 }}>
                  <div className={dash.orderHead}>
                    <div>
                      <h3 className={dash.orderId}>Order #{o.id}</h3>
                      <p className={dash.orderMeta}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}</p>
                    </div>
                    <span className={`${dash.pill} ${dash.pillReady}`}>{o.statusLabel || o.status}</span>
                  </div>
                  {orderDetails(o)}
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
