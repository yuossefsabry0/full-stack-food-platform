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
          <Link to={`/orders/${o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}><strong>Order #{o.id}</strong></Link>
          <p className="muted" style={{ margin: '4px 0' }}>
            Status: {o.statusLabel || o.status} · Total: ${Number(o.total ?? 0).toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  );
}
