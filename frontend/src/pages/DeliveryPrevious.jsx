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
            <strong>Order #{o.id}</strong>
            <p className="muted">{o.statusLabel || o.status}</p>
          </div>
        ))}
      </div>
    </>
  );
}
