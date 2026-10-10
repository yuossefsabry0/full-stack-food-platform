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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Order #{order.id}</h2>
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
            Status: {order.statusLabel || order.status}
          </span>
        </div>
        <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="muted">Items</span>
            <strong>{Array.isArray(order.items) ? order.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) : '—'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="muted">Placed</span>
            <strong>{order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</strong>
          </div>
        </div>
        {Array.isArray(order.items) && order.items.length > 0 && (
          <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {order.items.map((it, i) => (
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
            <strong>${Number(order.productsTotal ?? order.subtotal ?? 0).toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="muted">Delivery fee</span>
            <strong>${Number(order.deliveryFee ?? 0).toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>Total</span>
            <strong>${Number(order.total ?? 0).toFixed(2)}</strong>
          </div>
        </div>
        {order.address && (
          <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, fontSize: 14 }}>
            <span className="muted">Deliver to: </span>
            <strong>
              {order.address.name}, {order.address.address}, Bldg {order.address.buildingNumber},
              Apt {order.address.apartmentNumber}, {order.address.streetName} · {order.address.phoneNumber}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}
