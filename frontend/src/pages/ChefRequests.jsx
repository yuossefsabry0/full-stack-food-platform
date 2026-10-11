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

export default function ChefRequests() {
  const { logout, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [kitchen, setKitchen] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('all');

  async function load() {
    setError('');
    try {
      const res = await api.chefRequests();
      setOrders(listOf(res));
    } catch (err) {
      setError(err.message);
    }
    // Handed-over column reuses the EXISTING history endpoint (my orders
    // already handed to delivery). Read-only; PREPARING orders awaiting
    // hand-over stay in the requests queue above, not in history.
    try {
      const h = await api.chefHistory({ page: 1, limit: 20 });
      setKitchen(listOf(h).slice(0, 6));
    } catch {
      // history is secondary: requests columns still render
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Accept step: PENDING → PREPARING (user sees preparing).
  async function prepare(id) {
    setError('');
    setBusyId(id);
    try {
      await api.chefPrepare(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Hand-over step: PREPARING → READY_FOR_DELIVERY (only now visible to
  // delivery; the user display does not advance on hand-over).
  async function handover(id) {
    setError('');
    setBusyId(id);
    try {
      await api.chefHandover(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Read-only preparation details the backend already sends per order:
  // address, items, total. Same fields/shape as DeliveryCurrent.
  // Display-only; status and prepare flow untouched.
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

  function renderNewCard(o) {
    return (
      <article key={o.id} className={dash.orderCard}>
        <div className={dash.orderHead}>
          <div>
            <h3 className={dash.orderId}>Order #{o.id}</h3>
            <p className={dash.orderMeta}>{itemCount(o)} items · Ordered {timeOf(o)}</p>
          </div>
          <span className={`${dash.pill} ${dash.pillNew}`}>New</span>
        </div>
        <ul className={dash.itemList}>
          {(o.items || []).slice(0, 4).map((it, i) => (
            <li key={i} className={dash.itemRow}>
              <span className={dash.dot} aria-hidden="true" />
              {it.productName} × {it.quantity}
            </li>
          ))}
        </ul>
        {orderDetails(o)}
        <button
          className={dash.receiveBtn}
          onClick={() => prepare(o.id)}
          disabled={busyId === o.id}
        >
          {busyId === o.id ? 'Receiving…' : '🧡 Receive order'}
        </button>
      </article>
    );
  }

  function renderKitchenCard(o) {
    return (
      <article key={o.id} className={dash.orderCard}>
        <div className={dash.orderHead}>
          <div>
            <h3 className={dash.orderId}>Order #{o.id}</h3>
            <p className={dash.orderMeta}>{itemCount(o)} items · Ordered {timeOf(o)}</p>
          </div>
          <span className={`${dash.pill} ${dash.pillPreparing}`}>Preparing</span>
        </div>
        <ul className={dash.itemList}>
          {(o.items || []).slice(0, 4).map((it, i) => (
            <li key={i} className={dash.itemRow}>
              <span className={dash.dot} aria-hidden="true" />
              {it.productName} × {it.quantity}
            </li>
          ))}
        </ul>
        {orderDetails(o)}
        <button
          className={dash.handoverBtn}
          onClick={() => handover(o.id)}
          disabled={busyId === o.id}
        >
          {busyId === o.id ? 'Handing over…' : '✓ Hand over to delivery'}
        </button>
      </article>
    );
  }

  function renderHandedCard(o) {
    return (
      <article key={o.id} className={dash.orderCard}>
        <div className={dash.orderHead}>
          <div>
            <h3 className={dash.orderId}>Order #{o.id}</h3>
            <p className={dash.orderMeta}>{itemCount(o)} items · Ordered {timeOf(o)}</p>
          </div>
          <span className={`${dash.pill} ${dash.pillReady}`}>Handed over</span>
        </div>
        <ul className={dash.itemList}>
          {(o.items || []).slice(0, 4).map((it, i) => (
            <li key={i} className={dash.itemRow}>
              <span className={dash.dot} aria-hidden="true" />
              {it.productName} × {it.quantity}
            </li>
          ))}
        </ul>
        {orderDetails(o)}
        <button className={dash.handoverBtn} disabled title="With delivery now">
          ✓ Handed over
        </button>
      </article>
    );
  }

  // Kitchen queue split by real backend status: new PENDING orders to
  // accept, PREPARING orders to hand over. History lives only on the History
  // route (/chef/history); this route shows handed-over orders still awaiting
  // driver pickup (READY_FOR_DELIVERY).
  const newOrders = orders.filter((o) => o.status === 'PENDING');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const handedOrders = kitchen.filter((o) => o.status === 'READY_FOR_DELIVERY');
  const showNew = tab === 'all' || tab === 'new';
  const showKitchen = tab === 'all' || tab === 'preparing';

  return (
    <div className={dash.shell}>
      <aside className={dash.sidebar} aria-label="Chef navigation">
        <div className={dash.brand}>
          <span className={dash.brandMark} aria-hidden="true">J</span>
          Joo food
        </div>
        <nav className={dash.nav}>
          <Link to="/chef/requests" className={`${dash.navLink} ${dash.navLinkActive}`}>🧾 Orders</Link>
          <Link to="/chef/history" className={dash.navLink}>🕘 History</Link>
        </nav>
        <button type="button" className={dash.logoutBtn} onClick={logout}>↩ Logout</button>
      </aside>
      <main className={dash.main}>
        <div className={dash.topbar}>
          <div>
            <h1 className={dash.title}>Chef Dashboard</h1>
            <p className={dash.sub}>Receive the new orders, prepare them, hand over to delivery.</p>
          </div>
          <div className={dash.userChip}>
            <span className={dash.userName}>🧑‍🍳 {user?.username || 'chef'}</span>
            <button type="button" className={dash.topLogout} onClick={logout}>Logout</button>
          </div>
        </div>
        <div className={dash.tabs} role="tablist" aria-label="Order filters">
          <button type="button" role="tab" aria-selected={tab === 'all'} className={`${dash.tab} ${tab === 'all' ? dash.tabActive : ''}`} onClick={() => setTab('all')}>All ({newOrders.length + preparingOrders.length + handedOrders.length})</button>
          <button type="button" role="tab" aria-selected={tab === 'new'} className={`${dash.tab} ${tab === 'new' ? dash.tabActive : ''}`} onClick={() => setTab('new')}>New ({newOrders.length})</button>
          <button type="button" role="tab" aria-selected={tab === 'preparing'} className={`${dash.tab} ${tab === 'preparing' ? dash.tabActive : ''}`} onClick={() => setTab('preparing')}>Preparing ({preparingOrders.length})</button>
        </div>
        {error && <p className={dash.error} role="alert">{error}</p>}
        <div className={dash.columns}>
          {showNew && (
            <section aria-label="New orders">
              <h2 className={dash.columnTitle}>🟠 New orders <span className={dash.countBadge}>{newOrders.length}</span></h2>
              {newOrders.length === 0 && <div className={dash.emptyCard}>No pending orders.</div>}
              {newOrders.map(renderNewCard)}
            </section>
          )}
          {showKitchen && (
            <section aria-label="In the kitchen">
              <h2 className={dash.columnTitle}>👨‍🍳 In the kitchen <span className={dash.countBadge}>{preparingOrders.length}</span></h2>
              {preparingOrders.length === 0 && <div className={dash.emptyCard}>Nothing preparing right now.</div>}
              {preparingOrders.map(renderKitchenCard)}
            </section>
          )}
        </div>
        {tab === 'all' && (
          <section aria-label="Handed over to delivery" style={{ marginTop: 4 }}>
            <h2 className={dash.columnTitle}>🛵 Handed over to delivery <span className={dash.countBadge}>{handedOrders.length}</span></h2>
            {handedOrders.length === 0 && <div className={dash.emptyCard}>Nothing awaiting pickup.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {handedOrders.map(renderHandedCard)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
