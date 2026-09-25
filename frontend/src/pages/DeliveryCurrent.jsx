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
  function orderDetails(o) {
    return (
      <>
        <p className="muted" style={{ margin: '4px 0' }}>{o.statusLabel || o.status}</p>
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
      <RoleHeader title="Joo Food · Delivery" links={DELIVERY_LINKS} />
      <div className="page">
        <h2>Current delivery orders</h2>
        {error && <p className="error">{error}</p>}
        {mine.length > 0 && (
          <>
            <h3>My active delivery</h3>
            {mine.map((o) => (
              <div className="card" key={o.id} style={{ marginBottom: 10 }}>
                <strong>Order #{o.id}</strong>
                {orderDetails(o)}
                <button className="btn btn-primary" onClick={() => deliver(o.id)}>Mark delivered</button>
              </div>
            ))}
          </>
        )}
        <h3>Ready for delivery</h3>
        {orders.length === 0 && <div className="card"><p className="muted">Nothing ready right now.</p></div>}
        {orders.map((o) => (
          <div className="card" key={o.id} style={{ marginBottom: 10 }}>
            <strong>Order #{o.id}</strong>
            {orderDetails(o)}
            <button className="btn btn-primary" onClick={() => accept(o.id)}>Accept</button>
          </div>
        ))}
      </div>
    </>
  );
}
