import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { ADMIN_LINKS, RoleHeader } from '../components/RoleHeader.jsx';

function listOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.orders)) return d.orders;
  return [];
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function load(s = '') {
    setError('');
    try {
      const res = await api.adminOrders({ page: 1, limit: 20, status: s || undefined });
      setOrders(listOf(res));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <RoleHeader title="Joo Food · Admin" links={ADMIN_LINKS} />
      <div className="page">
        <h2>Orders</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(status);
          }}
          style={{ display: 'flex', gap: 8, marginBottom: 16 }}
        >
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PREPARING">PREPARING</option>
            <option value="READY_FOR_DELIVERY">READY_FOR_DELIVERY</option>
            <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
            <option value="DELIVERED">DELIVERED</option>
          </select>
          <button className="btn btn-primary" type="submit">Filter</button>
        </form>
        {error && <p className="error">{error}</p>}
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
                {o.status}
              </span>
            </div>
            <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Items</span>
                <strong>{Array.isArray(o.items) ? o.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) : '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Placed</span>
                <strong>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Total</span>
                <strong>${Number(o.total ?? 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Courier</span>
                <strong>{o.deliveryId ? `#${o.deliveryId}` : '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Chef</span>
                <strong>{o.chefId ? `#${o.chefId}` : '—'}</strong>
              </div>
            </div>
            {Array.isArray(o.items) && o.items.length > 0 && (
              <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {o.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                    <span>{it.productName} × {it.quantity}</span>
                    <strong>${Number(it.lineTotal ?? it.subtotal ?? 0).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && !error && <p className="muted">No orders found.</p>}
      </div>
    </>
  );
}
