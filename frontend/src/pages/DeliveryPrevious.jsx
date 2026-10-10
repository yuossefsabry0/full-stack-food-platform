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

export default function DeliveryPrevious() {
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
    <>
      <RoleHeader title="Joo Food · Delivery" links={DELIVERY_LINKS} />
      <div className="page">
        <h2>Previous deliveries (read-only)</h2>
        {error && <p className="error">{error}</p>}
        {orders.length === 0 && !error && (
          <div className="card"><p className="muted">No delivered orders yet.</p></div>
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
                {o.statusLabel || o.status}
              </span>
            </div>
            {orderDetails(o)}
          </div>
        ))}
      </div>
    </>
  );
}
