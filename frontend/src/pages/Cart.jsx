import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

function cartItemsOf(cart) {
  if (!cart) return [];
  if (Array.isArray(cart.items)) return cart.items;
  return [];
}

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const res = await api.cart();
      setCart(res.data?.cart || res.data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeQty(productId, quantity) {
    try {
      await api.cartUpdate(productId, { quantity });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeItem(productId) {
    try {
      await api.cartRemove(productId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirm() {
    setError('');
    try {
      await api.cartConfirm();
      navigate('/delivery-address');
    } catch (err) {
      setError(err.message);
    }
  }

  const items = cartItemsOf(cart);

  return (
    <div className="page">
      <h2>Cart</h2>
      {error && <p className="error">{error}</p>}
      {items.length === 0 ? (
        <div className="card"><p className="muted">Your cart is empty. Browse the Menu to add dishes.</p></div>
      ) : (
        <>
          {items.map((it) => {
            const pid = it.productId ?? it.product?.id;
            const itemName = it.name || it.product?.name || it.productName || `Product #${pid}`;
            const unitPrice = Number(it.price ?? it.product?.price ?? 0);
            const lineTotal = Number(it.lineTotal ?? unitPrice * it.quantity);
            const itemImage = it.image || it.product?.image || it.product?.imageUrl || null;
            return (
              <div className="card" key={pid} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {itemImage ? (
                    <img
                      src={itemImage}
                      alt={itemName}
                      style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      style={{ width: 64, height: 64, borderRadius: 12, background: 'linear-gradient(135deg,#e0e7ff,#fef3c7)', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 15 }}>{itemName}</strong>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                      ${unitPrice.toFixed(2)} each · Qty {it.quantity} · <strong style={{ color: '#1f2937' }}>${lineTotal.toFixed(2)}</strong>
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                  <div
                    role="group"
                    aria-label={`Quantity for ${itemName}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 999,
                      padding: 4,
                      boxShadow: '0 1px 2px rgba(16, 24, 40, 0.06)',
                    }}
                  >
                    <button
                      className="btn"
                      type="button"
                      aria-label={`Decrease quantity for ${itemName}`}
                      onClick={() => (it.quantity <= 1 ? removeItem(pid) : changeQty(pid, it.quantity - 1))}
                      style={{
                        width: 32,
                        height: 32,
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        border: '1px solid #e2e8f0',
                        background: '#fff',
                        fontSize: 16,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: '#111827',
                        cursor: 'pointer',
                      }}
                    >
                      −
                    </button>
                    <span
                      aria-live="polite"
                      style={{
                        minWidth: 36,
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                        fontVariantNumeric: 'tabular-nums',
                        userSelect: 'none',
                        color: '#1f2937',
                      }}
                    >
                      {it.quantity}
                    </span>
                    <button
                      className="btn"
                      type="button"
                      aria-label={`Increase quantity for ${itemName}`}
                      onClick={() => changeQty(pid, it.quantity + 1)}
                      style={{
                        width: 32,
                        height: 32,
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        border: '1px solid #111827',
                        background: '#111827',
                        fontSize: 16,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="btn"
                    onClick={() => removeItem(pid)}
                    style={{ borderRadius: 999, padding: '8px 16px', fontWeight: 600, color: '#991b1b', borderColor: '#fecaca', background: '#fff7f7' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
              <span className="muted">Products total</span>
              <strong>${Number(cart.productsTotal ?? cart.subtotal ?? 0).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
              <span className="muted">Delivery fee</span>
              <strong>${Number(cart.deliveryFee ?? 0).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 4, borderTop: '1px solid #e5e7eb', fontSize: 15 }}>
              <span>Total</span>
              <strong>${Number(cart.totalAmount ?? cart.total ?? 0).toFixed(2)}</strong>
            </div>
            <button className="btn btn-primary" onClick={confirm} style={{ borderRadius: 999, padding: '10px 22px', fontWeight: 600, fontSize: 14, marginTop: 8 }}>Confirm — continue to delivery address</button>
          </div>
        </>
      )}
    </div>
  );
}
