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
            <strong>Order #{o.id}</strong>
            <p className="muted">
              {o.status} · ${Number(o.total ?? 0).toFixed(2)}
              {o.deliveryId ? ` · courier ${o.deliveryId}` : ''}
              {o.chefId ? ` · chef ${o.chefId}` : ''}
            </p>
          </div>
        ))}
        {orders.length === 0 && !error && <p className="muted">No orders found.</p>}
      </div>
    </>
  );
}
