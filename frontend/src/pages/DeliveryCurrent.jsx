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

export default function DeliveryCurrent() {
  const { logout, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [mine, setMine] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('all');

  async function load() {
    setError('');
    try {
      const res = await api.deliveryCurrent();
      // Backend returns ONE merged array under data.items: the courier's own
      // OUT_FOR_DELIVERY orders first, then unclaimed READY_FOR_DELIVERY ones.
      const all = listOf(res);
      setMine(all.filter((o) => o.status === 'OUT_FOR_DELIVERY'));
      setOrders(all.filter((o) => o.status === 'READY_FOR_DELIVERY'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function accept(id) {
    setError('');
    setBusyId(id);
    try {
      await api.deliveryAccept(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function deliver(id) {
    setError('');
    setBusyId(id);
    try {
      await api.deliveryDeliver(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Full delivery data the backend already sends per order: address, items, total.
  // Display-only; accept/deliver flow and status untouched.
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
        {o.address && (
          <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, fontSize: 14 }}>
            <span className="muted">Deliver to: </span>
            <strong>
              {o.address.name}, {o.address.address}, Bldg {o.address.buildingNumber},
              Apt {o.address.apartmentNumber}, {o.address.streetName} · {o.address.phoneNumber}
            </strong>
          </div>
        )}
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
      </>
    );
  }

  function itemCount(o) {
    return Array.isArray(o.items) ? o.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0;
  }

  function timeOf(o) {
    try {
      return o.createdAt
        ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—';
    } catch {
      return '—';
    }
  }

  function renderReadyCard(o) {
    return (
      <article key={o.id} className={dash.orderCard}>
        <div className={dash.orderHead}>
          <div>
            <h3 className={dash.orderId}>Order #{o.id}</h3>
            <p className={dash.orderMeta}>{itemCount(o)} items · Ordered {timeOf(o)}</p>
          </div>
          <span className={`${dash.pill} ${dash.pillReady}`}>Ready</span>
        </div>
        <ul className={dash.itemList}>
          {(o.items || []).slice(0, 4).map((it, i) => (
            <li key={i} className={dash.itemRow}><span className={dash.dot} aria-hidden="true" />{it.productName} × {it.quantity}</li>
          ))}
        </ul>
        {o.address && (
          <div className={dash.customerBox}>
            <span>👤 Customer: <strong>{o.address.name}</strong></span>
            <span>📍 {o.address.address}, Bldg {o.address.buildingNumber}, Apt {o.address.apartmentNumber} · {o.address.phoneNumber}</span>
          </div>
        )}
        <div className={dash.totalRow}>
          <span className="muted">Price ${Number(o.productsTotal ?? 0).toFixed(2)} + Delivery ${Number(o.deliveryFee ?? 0).toFixed(2)}</span>
          <strong className={dash.totalStrong}>${Number(o.total ?? 0).toFixed(2)}</strong>
        </div>
        {orderDetails(o)}
        <button className={dash.receiveBtn} onClick={() => accept(o.id)} disabled={busyId === o.id}>
          {busyId === o.id ? 'Accepting…' : '🛵 Receive order'}
        </button>
      </article>
    );
  }

  function renderWayCard(o) {
    return (
      <article key={o.id} className={dash.orderCard}>
        <div className={dash.orderHead}>
          <div>
            <h3 className={dash.orderId}>Order #{o.id}</h3>
            <p className={dash.orderMeta}>{itemCount(o)} items · Ordered {timeOf(o)}</p>
          </div>
          <span className={`${dash.pill} ${dash.pillWay}`}>On the way</span>
        </div>
        <ul className={dash.itemList}>
          {(o.items || []).slice(0, 4).map((it, i) => (
            <li key={i} className={dash.itemRow}><span className={dash.dot} aria-hidden="true" />{it.productName} × {it.quantity}</li>
          ))}
        </ul>
        {o.address && (
          <div className={dash.customerBox}>
            <span>👤 Customer: <strong>{o.address.name}</strong></span>
            <span>📍 {o.address.address}, Bldg {o.address.buildingNumber}, Apt {o.address.apartmentNumber} · {o.address.phoneNumber}</span>
          </div>
        )}
        <div className={dash.totalRow}>
          <span className="muted">Cash on delivery</span>
          <strong className={dash.totalStrong}>${Number(o.total ?? 0).toFixed(2)}</strong>
        </div>
        {orderDetails(o)}
        <button className={dash.handoverBtn} onClick={() => deliver(o.id)} disabled={busyId === o.id}>
          {busyId === o.id ? 'Delivering…' : '✓ Delivered to customer'}
        </button>
      </article>
    );
  }

  const showReady = tab === 'all' || tab === 'ready';
  const showWay = tab === 'all' || tab === 'way';

  return (
    <div className={dash.shell}>
      <aside className={dash.sidebar} aria-label="Delivery navigation">
        <div className={dash.brand}>
          <span className={dash.brandMark} aria-hidden="true">J</span>
          Joo food
        </div>
        <nav className={dash.nav}>
          <Link to="/delivery/current" className={`${dash.navLink} ${dash.navLinkActive}`}>🧾 Orders</Link>
          <Link to="/delivery/previous" className={dash.navLink}>🕘 History</Link>
        </nav>
        <button type="button" className={dash.logoutBtn} onClick={logout}>↩ Logout</button>
      </aside>
      <main className={dash.main}>
        <div className={dash.topbar}>
          <div>
            <h1 className={dash.title}>Delivery Dashboard</h1>
            <p className={dash.sub}>Accept the chef, deliver, done.</p>
          </div>
          <div className={dash.userChip}>
            <span className={dash.userName}>🛵 {user?.username || 'delivery'}</span>
            <button type="button" className={dash.topLogout} onClick={logout}>Logout</button>
          </div>
        </div>
        <div className={dash.tabs} role="tablist" aria-label="Delivery filters">
          <button type="button" role="tab" aria-selected={tab === 'all'} className={`${dash.tab} ${tab === 'all' ? dash.tabActive : ''}`} onClick={() => setTab('all')}>All ({orders.length + mine.length})</button>
          <button type="button" role="tab" aria-selected={tab === 'ready'} className={`${dash.tab} ${tab === 'ready' ? dash.tabActive : ''}`} onClick={() => setTab('ready')}>Ready to pick up ({orders.length})</button>
          <button type="button" role="tab" aria-selected={tab === 'way'} className={`${dash.tab} ${tab === 'way' ? dash.tabActive : ''}`} onClick={() => setTab('way')}>On the way ({mine.length})</button>
        </div>
        {error && <p className={dash.error} role="alert">{error}</p>}
        <div className={dash.columns}>
          {showReady && (
            <section aria-label="Ready to pick up">
              <h2 className={dash.columnTitle}>📦 Ready to pick up <span className={dash.countBadge}>{orders.length}</span></h2>
              {orders.length === 0 && <div className={dash.emptyCard}>Nothing ready right now.</div>}
              {orders.map(renderReadyCard)}
            </section>
          )}
          {showWay && (
            <section aria-label="On the way">
              <h2 className={dash.columnTitle}>🛵 On the way <span className={dash.countBadge}>{mine.length}</span></h2>
              {mine.length === 0 && <div className={dash.emptyCard}>No active delivery.</div>}
              {mine.map(renderWayCard)}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
