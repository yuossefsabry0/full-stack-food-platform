import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DELIVERY_LINKS, RoleHeader } from '../components/RoleHeader.jsx';

function listOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.orders)) return d.orders;
  return [];
}

export default function DeliveryCurrent() {
  const [orders, setOrders] = useState([]);
  const [mine, setMine] = useState([]);
  const [error, setError] = useState('');

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
    try {
      await api.deliveryAccept(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deliver(id) {
    setError('');
    try {
      await api.deliveryDeliver(id);
      await load();
    } catch (err) {
      setError(err.message);
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

  return (
    <>
      <RoleHeader title="Joo Food · Delivery" links={DELIVERY_LINKS} />
      <div className="page">
        <h2>Current delivery orders</h2>
        {error && <p className="error">{error}</p>}
        {mine.length > 0 && (
          <>
            <h3>My active delivery</h3>
            {mine.map((o) => (
              <div className="card" key={o.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 16 }}>Order #{o.id}</strong>
                  <span
                    style={{
                      display: 'inline-block',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 999,
                      padding: '4px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1f2937',
                    }}
                  >
                    {o.statusLabel || o.status}
                  </span>
                </div>
                {orderDetails(o)}
                <button
                  className="btn btn-primary"
                  onClick={() => deliver(o.id)}
                  style={{ display: 'block', width: '100%', textAlign: 'center', borderRadius: 8, padding: '10px 14px', fontWeight: 600, fontSize: 14, marginTop: 10 }}
                >
                  Mark delivered
                </button>
              </div>
            ))}
          </>
        )}
        <h3>Ready for delivery</h3>
        {orders.length === 0 && <div className="card"><p className="muted">Nothing ready right now.</p></div>}
        {orders.map((o) => (
          <div className="card" key={o.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 16 }}>Order #{o.id}</strong>
              <span
                style={{
                  display: 'inline-block',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 999,
                  padding: '4px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1f2937',
                }}
              >
                {o.statusLabel || o.status}
              </span>
            </div>
            {orderDetails(o)}
            <button
              className="btn btn-primary"
              onClick={() => accept(o.id)}
              style={{ display: 'block', width: '100%', textAlign: 'center', borderRadius: 8, padding: '10px 14px', fontWeight: 600, fontSize: 14, marginTop: 10 }}
            >
              Accept
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
