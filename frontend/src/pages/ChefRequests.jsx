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

export default function ChefRequests() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const res = await api.chefRequests();
      setOrders(listOf(res));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function prepare(id) {
    setError('');
    try {
      await api.chefPrepare(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Read-only preparation details the backend already sends per order:
  // address, items, total. Same fields/shape as DeliveryCurrent.
  function orderDetails(o) {
    return (
      <>
        {o.address && (
          <p style={{ margin: '4px 0', fontSize: 14 }}>
            Deliver to: {o.address.name}, {o.address.address}, Bldg {o.address.buildingNumber},
            Apt {o.address.apartmentNumber}, {o.address.streetName} · {o.address.phoneNumber}
          </p>
        )}
        {Array.isArray(o.items) && o.items.length > 0 && (
          <ul style={{ margin: '6px 0', paddingLeft: 20, fontSize: 14 }}>
            {o.items.map((it, i) => (
              <li key={i}>
                {it.productName} × {it.quantity} — ${Number(it.subtotal ?? it.lineTotal ?? 0).toFixed(2)}
              </li>
            ))}
          </ul>
        )}
        <p className="muted" style={{ margin: '4px 0' }}>Total: ${Number(o.total ?? 0).toFixed(2)}</p>
      </>
    );
  }

  return (
    <>
      <RoleHeader title="Joo Food · Kitchen" links={CHEF_LINKS} />
      <div className="page">
        <h2>Request orders (PENDING)</h2>
        {error && <p className="error">{error}</p>}
        {orders.length === 0 && !error && (
          <div className="card"><p className="muted">No pending orders.</p></div>
        )}
        {orders.map((o) => (
          <div className="card" key={o.id} style={{ marginBottom: 10 }}>
            <strong>Order #{o.id}</strong>
            <p className="muted" style={{ margin: '4px 0' }}>Status: {o.status}</p>
            {orderDetails(o)}
            <button className="btn btn-primary" onClick={() => prepare(o.id)}>Mark prepared</button>
          </div>
        ))}
      </div>
    </>
  );
}
