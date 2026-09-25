import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .orderDetails(id)
      .then((res) => setOrder(res.data?.order || res.data))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error && !order) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <button className="btn" onClick={() => navigate('/orders')}>Back to Orders</button>
      </div>
    );
  }
  if (!order) return <div className="page"><p className="muted">Loading…</p></div>;

  return (
    <div className="page">
      <button className="btn" onClick={() => navigate('/orders')}>← Orders</button>
      <div className="card" style={{ marginTop: 12 }}>
        <h2>Order Number : {order.id}</h2>
        <p>Status: <strong>{order.statusLabel || order.status}</strong></p>
        <p className="muted">Total: ${Number(order.total ?? 0).toFixed(2)}</p>
        {Array.isArray(order.items) && (
          <ul>
            {order.items.map((it, i) => (
              <li key={i}>
                {it.productName},  Quantity = {it.quantity} , price = ${Number(it.lineTotal ?? it.subtotal ?? 0).toFixed(2)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
