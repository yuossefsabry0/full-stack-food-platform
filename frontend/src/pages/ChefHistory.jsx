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
            <strong>Order #{o.id}</strong>
            <p className="muted" style={{ margin: '4px 0' }}>Status: {o.statusLabel || o.status}</p>
          </div>
        ))}
      </div>
    </>
  );
}
