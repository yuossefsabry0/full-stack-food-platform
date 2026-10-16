import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import sf from './Storefront.module.css';

// Delivery Address route: posts the full address to POST /orders/checkout
// (all six fields required by backend Zod validation; otherDetails below
// the phone number is optional and sent only when filled in).
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
    otherDetails: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
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
    // Clear that field's own message as soon as the user edits it again.
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // Backend VALIDATION_ERROR responses carry per-field details
  // ({ field, message }); surface each beneath its own input instead of a
  // single generic line. Returns true when field messages were shown.
  function applyFieldErrors(err) {
    const details = err?.payload?.errors;
    if (!Array.isArray(details) || details.length === 0) return false;
    const mapped = {};
    for (const item of details) {
      if (typeof item === 'string') continue;
      const field = item?.field;
      const message = item?.message;
      if (typeof field === 'string' && field && typeof message === 'string' && message && mapped[field] === undefined) {
        mapped[field] = message;
      }
    }
    if (Object.keys(mapped).length === 0) return false;
    setFieldErrors(mapped);
    return true;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    try {
      // otherDetails is optional: omit it when blank so the payload stays
      // exactly the six required fields as before.
      const payload = { ...form };
      if (!String(payload.otherDetails || '').trim()) delete payload.otherDetails;
      else payload.otherDetails = String(payload.otherDetails).trim().slice(0, 500);
      await api.checkout(payload);
      // Refresh the bell: backend stored an order-placed notification.
      try {
        window.dispatchEvent(new CustomEvent('fp:notifications-refresh'));
      } catch { /* ignore */ }
      navigate('/orders');
    } catch (err) {
      // Prefer the field-specific message beneath its input; the generic
      // line below stays as the fallback for non-field errors.
      if (!applyFieldErrors(err)) setError(err.message);
    }
  }

  return (
    <div className={sf.page}>
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
                <input className="input" value={form[key]} onChange={(e) => set(key, e.target.value)} required={key !== 'otherDetails'} />
                {fieldErrors[key] && <span className="error" role="alert">{fieldErrors[key]}</span>}
              </label>
            ))}
            <label className="field">
              Other Details (optional)
              <textarea
                className="input"
                value={form.otherDetails}
                onChange={(e) => set('otherDetails', e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Anything else the chef or delivery person should know"
              />
              {fieldErrors.otherDetails && <span className="error" role="alert">{fieldErrors.otherDetails}</span>}
            </label>
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
