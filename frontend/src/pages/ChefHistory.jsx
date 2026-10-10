import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { CHEF_LINKS, RoleHeader } from '../components/RoleHeader.jsx';

function listOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.orders)) return d.orders;
  return [];
}

export default function ChefHistory() {
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
    <>
      <RoleHeader title="Joo Food · Kitchen" links={CHEF_LINKS} />
      <div className="page">
        <h2>Prepared orders (read-only history)</h2>
        {error && <p className="error">{error}</p>}
        {orders.length === 0 && !error && (
          <div className="card"><p className="muted">No prepared orders yet.</p></div>
        )}
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
                Status: {o.statusLabel || o.status}
              </span>
            </div>
            {orderDetails(o)}
          </div>
        ))}
      </div>
    </>
  );
}
