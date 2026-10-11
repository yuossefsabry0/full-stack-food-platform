import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import sf from './Storefront.module.css';

// Read-only progress derived only from fields the API already returns
// (status/createdAt/preparedAt/acceptedAt/deliveredAt). No new endpoints,
// no status writes, no role changes.
const PROGRESS = [
  { key: 'PENDING', label: 'In Progress' },
  { key: 'READY_FOR_DELIVERY', label: 'Ready for Delivery' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const STEP_AT = { PENDING: 'createdAt', PREPARING: 'preparedAt', READY_FOR_DELIVERY: 'preparedAt', OUT_FOR_DELIVERY: 'acceptedAt', DELIVERED: 'deliveredAt' };

function stepIndex(status) {
  switch (status) {
    case 'PREPARING':
    case 'READY_FOR_DELIVERY':
      return 1;
    case 'OUT_FOR_DELIVERY':
      return 2;
    case 'DELIVERED':
      return 3;
    default:
      return 0;
  }
}

const AVATARS = ['#ffe4e6', '#fef3c7', '#dcfce7', '#e0e7ff', '#fce7f3', '#ffedd5'];

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
      <div className={sf.page}>
        <p className="error" role="alert">{error}</p>
        <button className={sf.ctaGhost} onClick={() => navigate('/orders')}>Back to Orders</button>
      </div>
    );
  }
  if (!order) {
    return (
      <div className={sf.page}>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const done = stepIndex(order.status);
  const delivered = order.status === 'DELIVERED';
  const count = Array.isArray(order.items) ? order.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) : '—';
  const addr = order.address;

  return (
    <div className={sf.page}>
      <span className={sf.pageLabel}>
        <span className={sf.pageLabelDot} aria-hidden="true" />
        Order Details
      </span>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '12px 0 4px' }}>
        <h2 className={sf.sectionTitle} style={{ fontSize: 28 }}>
          Order #{order.id}{' '}
          <span className={`${sf.statusPill} ${delivered ? sf.statusDone : sf.statusActive}`}>
            {order.statusLabel || order.status}
          </span>
        </h2>
        <Link to="/orders" className={sf.sectionLink}>
          ← Back to orders
        </Link>
      </div>
      <p className={sf.sectionSub}>
        Placed {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'} · {count} item(s)
      </p>

      <div className={sf.panel} aria-label="Order progress">
        <h3 className={sf.panelTitle}>Order progress</h3>
        <ol className={sf.progress} aria-label={`Progress for order ${order.id}`}>
          {PROGRESS.map((s, i) => {
            const at = order[STEP_AT[s.key]];
            return (
              <li
                key={s.key}
                className={`${sf.progressStep} ${i <= done ? sf.progressDone : ''}`}
                aria-current={i === done ? 'step' : undefined}
                title={at ? new Date(at).toLocaleString() : s.label}
              >
                {s.label}
              </li>
            );
          })}
        </ol>
      </div>

      <div className={sf.columns}>
        <div className={sf.panel}>
          <h3 className={sf.panelTitle}>Items ({count} products)</h3>
          {Array.isArray(order.items) &&
            order.items.map((it, i) => (
              <div className={sf.cartRow} key={i}>
                <div
                  className={sf.cartThumb}
                  aria-hidden="true"
                  style={{
                    background: AVATARS[i % AVATARS.length],
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 20,
                    color: '#57534e',
                  }}
                >
                  {(it.productName || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className={sf.cartName}>{it.productName}</p>
                  <p className={sf.cartUnit}>
                    ${Number(it.unitPrice ?? 0).toFixed(2)} each · Qty {it.quantity}
                  </p>
                </div>
                <strong style={{ fontSize: 14 }}>${Number(it.subtotal ?? it.lineTotal ?? 0).toFixed(2)}</strong>
              </div>
            ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {addr && (
            <div className={sf.panel} aria-label="Delivery address">
              <h3 className={sf.panelTitle}>Deliver to</h3>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>{addr.name}</p>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {addr.address}, Bldg {addr.buildingNumber}, Apt {addr.apartmentNumber},{' '}
                {addr.streetName} · {addr.phoneNumber}
              </p>
              <div
                aria-hidden="true"
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  height: 110,
                  background: 'linear-gradient(135deg, #d9f2e6 0%, #e7e5f4 55%, #fde8d8 100%)',
                  border: '1px solid #f0e7da',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                }}
              >
                📍
              </div>
            </div>
          )}
          <div className={sf.panel} aria-label="Payment summary">
            <h3 className={sf.panelTitle}>Payment summary</h3>
            <div className={sf.sumRow}>
              <span>Products total</span>
              <strong>${Number(order.productsTotal ?? order.subtotal ?? 0).toFixed(2)}</strong>
            </div>
            <div className={sf.sumRow}>
              <span>Delivery fee</span>
              <strong>${Number(order.deliveryFee ?? 0).toFixed(2)}</strong>
            </div>
            <div className={sf.sumTotal}>
              <span>Total</span>
              <span style={{ color: '#ea580c' }}>${Number(order.total ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
