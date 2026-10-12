import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import sf from './Storefront.module.css';

// Delivery Address route: posts the full address to POST /orders/checkout
// (all six fields required by backend Zod validation).
const FIELDS = [
  ['name', 'Recipient name'],
  ['address', 'Address'],
  ['buildingNumber', 'Building number'],
  ['apartmentNumber', 'Apartment number'],
  ['streetName', 'Street name'],
  ['phoneNumber', 'Phone number'],
];

export default function DeliveryAddress() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    address: '',
    buildingNumber: '',
    apartmentNumber: '',
    streetName: '',
    phoneNumber: '',
  });
  const [error, setError] = useState('');
  const [eligibility, setEligibility] = useState(null);

  useEffect(() => {
    api
      .cartConfirm()
      .then((res) => setEligibility(res.data?.preview || null))
      .catch(() => {});
  }, []);

  const canCheckout = eligibility ? eligibility.canCheckout !== false : true;

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.checkout(form);
      // Refresh the bell: backend stored an order-placed notification.
      try {
        window.dispatchEvent(new CustomEvent('fp:notifications-refresh'));
      } catch { /* ignore */ }
      navigate('/orders');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className={sf.page}>
      <span className={sf.pageLabel}>
        <span className={sf.pageLabelDot} aria-hidden="true" />
        Order Page
      </span>
      <h2 className={sf.sectionTitle} style={{ fontSize: 28, margin: '12px 0 4px' }}>
        Checkout
      </h2>
      <p className={sf.sectionSub}>Confirm where your order should be delivered.</p>

      <div className={sf.columns}>
        <div className={sf.panel}>
          <h3 className={sf.panelTitle}>Delivery address</h3>
          <form onSubmit={onSubmit}>
            {FIELDS.map(([key, label]) => (
              <label className="field" key={key}>
                {label}
                <input className="input" value={form[key]} onChange={(e) => set(key, e.target.value)} required />
              </label>
            ))}
            {error && <p className="error" role="alert">{error}</p>}
            {canCheckout === false && (
              <p className="error">
                You already have an active order{eligibility?.activeOrderId ? ` (order #${eligibility.activeOrderId})` : ''}. A new order is possible after it is delivered.
              </p>
            )}
            <button className={`${sf.ctaPrimary} ${sf.wideCta}`} type="submit" disabled={canCheckout === false}>
              Place order{eligibility ? ` · $${Number(eligibility.totalAmount ?? 0).toFixed(2)}` : ''}
            </button>
          </form>
        </div>
        <div className={sf.panel} aria-label="Order summary">
          <h3 className={sf.panelTitle}>Order summary</h3>
          {eligibility ? (
            <>
              <div className={sf.sumRow}>
                <span>Items</span>
                <strong>{eligibility.count ?? '—'}</strong>
              </div>
              <div className={sf.sumRow}>
                <span>Products total</span>
                <strong>${Number(eligibility.productsTotal ?? 0).toFixed(2)}</strong>
              </div>
              <div className={sf.sumRow}>
                <span>Delivery fee</span>
                <strong>${Number(eligibility.deliveryFee ?? 0).toFixed(2)}</strong>
              </div>
              <div className={sf.sumTotal}>
                <span>Total</span>
                <span>${Number(eligibility.totalAmount ?? 0).toFixed(2)}</span>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>Loading your cart totals…</p>
          )}
        </div>
      </div>
    </div>
  );
}
