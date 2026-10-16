import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import sf from './Storefront.module.css';

function cartItemsOf(cart) {
  if (!cart) return [];
  if (Array.isArray(cart.items)) return cart.items;
  return [];
}

const POPULAR_TILES = ['#ffe4e6', '#fef3c7', '#dcfce7'];

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [popular, setPopular] = useState([]);
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

  // Popular dishes for the empty-cart panel (real menu data; failures are
  // ignored so the empty state never breaks).
  useEffect(() => {
    let cancelled = false;
    api
      .menu({ page: 1, limit: 3 })
      .then((res) => {
        const d = res?.data;
        const list = Array.isArray(d) ? d : d?.items || [];
        if (!cancelled) setPopular(list.slice(0, 3));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
        <>
          <div className={sf.emptyWrap}>
            <div className={sf.emptyRing} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4h2l2.4 12h11.4l2.2-8H7" />
                <circle cx="9.5" cy="19.5" r="1.4" fill="#ea580c" stroke="none" />
                <circle cx="16.5" cy="19.5" r="1.4" fill="#ea580c" stroke="none" />
              </svg>
              <span className={sf.emptySpark} style={{ left: 14, top: 22 }}>✦</span>
              <span className={sf.emptySpark} style={{ right: 16, bottom: 20 }}>✦</span>
            </div>
            <h3 className={sf.emptyTitle}>Your cart is empty</h3>
            <p className={sf.emptyText}>
              Looks like you haven&apos;t added anything yet. Explore our menu and pick something delicious!
            </p>
            <div className={sf.emptyCtas}>
              <Link className={sf.ctaPrimary} to="/menu">
                Browse menu
              </Link>
            </div>
          </div>
          {popular.length > 0 && (
            <div className={sf.section}>
              <div className={sf.sectionHead}>
                <h3 className={sf.sectionTitle} style={{ fontSize: 19 }}>Popular right now</h3>
                <Link className={sf.sectionLink} to="/menu">
                  Full menu →
                </Link>
              </div>
              <div className={sf.grid}>
                {popular.map((p, i) => (
                  <Link key={p.id} to={`/products/${p.id}`} className={sf.dishCard}>
                    <div className={sf.dishTile} style={{ background: POPULAR_TILES[i % POPULAR_TILES.length] }}>
                      {(p.imageUrl || p.image) && (
                        <img src={p.imageUrl || p.image} alt={p.name} loading="lazy" />
                      )}
                    </div>
                    <div className={sf.dishBody}>
                      <h4 className={sf.dishName}>{p.name}</h4>
                      <div className={sf.dishFoot}>
                        <span className={sf.dishPrice}>${Number(p.price).toFixed(2)}</span>
                        <span className={sf.dishAdd} aria-hidden="true">+</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
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
                      <div className="qty" role="group" aria-label={`Quantity for ${itemName}`}>
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
