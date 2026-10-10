import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

function unwrapList(res) {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.orders)) return data.orders;
  return [];
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .orders({ page: 1, limit: 20 })
      .then((res) => setOrders(unwrapList(res)))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <h2>Orders</h2>
      {error && <p className="error">{error}</p>}
      {orders.length === 0 && !error && <div className="card"><p className="muted">No orders yet.</p></div>}
      {orders.map((o) => (
        <div className="card" key={o.id} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <Link to={`/orders/${o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}><strong style={{ fontSize: 16 }}>Order #{o.id}</strong></Link>
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
              Status: {o.statusLabel || o.status}
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
          </div>
          <Link
            to={`/orders/${o.id}`}
            className="btn btn-primary"
            style={{ display: 'block', width: '100%', textAlign: 'center', borderRadius: 8, padding: '10px 14px', fontWeight: 600, fontSize: 14, marginTop: 10, textDecoration: 'none' }}
          >
            View Details
          </Link>
        </div>
      ))}
    </div>
  );
}
