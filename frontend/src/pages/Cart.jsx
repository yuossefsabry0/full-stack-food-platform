import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import sf from './Storefront.module.css';

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

  const [activeOrderId, setActiveOrderId] = useState(null);

  async function confirm() {
    setError('');
    setActiveOrderId(null);
    try {
      const res = await api.cartConfirm();
      // Existing contract: preview carries canCheckout + activeOrderId when a
      // single-active-order is already open. Surface it instead of only an error.
      const preview = res?.data?.preview;
      if (preview && preview.canCheckout === false && preview.activeOrderId) {
        setActiveOrderId(preview.activeOrderId);
      }
      navigate('/delivery-address');
    } catch (err) {
      // Checkout-guard shape also carries the active order id on 409 in some
      // flows; capture it when present so the user can jump to that order.
      const payload = err?.payload;
      const id =
        payload?.data?.preview?.activeOrderId ??
        payload?.data?.activeOrderId ??
        payload?.activeOrderId ??
        null;
      if (id) setActiveOrderId(id);
      setError(err.message);
    }
  }

  const items = cartItemsOf(cart);

  return (
    <div className={sf.page}>
      <span className={sf.pageLabel}>
        <span className={sf.pageLabelDot} aria-hidden="true" />
        Cart Page
      </span>
      <h2 className={sf.sectionTitle} style={{ fontSize: 28, margin: '12px 0 4px' }}>
        Your Cart
      </h2>
      <p className={sf.sectionSub}>
        {items.length === 0 ? 'Nothing here yet.' : `${items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)} item(s) ready for checkout.`}
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {activeOrderId && (
        <div className={sf.panel} style={{ marginBottom: 12 }}>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            You already have an active order.{' '}
            <Link to={`/orders/${activeOrderId}`}>View active order #{activeOrderId}</Link>
          </p>
        </div>
      )}
      {items.length === 0 ? (
        <div className={sf.panel}>
          <p className="muted" style={{ margin: 0 }}>
            Your cart is empty. <Link to="/menu">Browse the Menu</Link> to add dishes.
          </p>
        </div>
      ) : (
        <div className={sf.columns}>
          <div className={sf.panel}>
            <h3 className={sf.panelTitle}>Items</h3>
            {items.map((it) => {
              const pid = it.productId ?? it.product?.id;
              const itemName = it.name || it.product?.name || it.productName || `Product #${pid}`;
              const unitPrice = Number(it.price ?? it.product?.price ?? 0);
              const lineTotal = Number(it.lineTotal ?? unitPrice * it.quantity);
              const itemImage = it.image || it.product?.image || it.product?.imageUrl || null;
              return (
                <div className={sf.cartRow} key={pid}>
                  {itemImage ? (
                    <img src={itemImage} alt={itemName} className={sf.cartThumb} loading="lazy" />
                  ) : (
                    <div className={sf.cartThumb} aria-hidden="true" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className={sf.cartName}>{itemName}</p>
                    <p className={sf.cartUnit}>
                      ${unitPrice.toFixed(2)} each · <strong style={{ color: '#1c1917' }}>${lineTotal.toFixed(2)}</strong>
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                      <div className={sf.stepper} role="group" aria-label={`Quantity for ${itemName}`}>
                        <button
                          type="button"
                          aria-label={`Decrease quantity for ${itemName}`}
                          onClick={() => (it.quantity <= 1 ? removeItem(pid) : changeQty(pid, it.quantity - 1))}
                        >
                          −
                        </button>
                        <span aria-live="polite">{it.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase quantity for ${itemName}`}
                          onClick={() => changeQty(pid, it.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button type="button" className={sf.removeLink} onClick={() => removeItem(pid)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={sf.panel} aria-label="Order summary">
            <h3 className={sf.panelTitle}>Summary</h3>
            <div className={sf.sumRow}>
              <span>Subtotal</span>
              <strong>${Number(cart.productsTotal ?? cart.subtotal ?? 0).toFixed(2)}</strong>
            </div>
            <div className={sf.sumRow}>
              <span>Delivery</span>
              <strong>${Number(cart.deliveryFee ?? 0).toFixed(2)}</strong>
            </div>
            <div className={sf.sumTotal}>
              <span>Total</span>
              <span>${Number(cart.totalAmount ?? cart.total ?? 0).toFixed(2)}</span>
            </div>
            <button className={`${sf.ctaPrimary} ${sf.wideCta}`} onClick={confirm}>
              Proceed to checkout →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
