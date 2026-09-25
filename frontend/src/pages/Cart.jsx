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
            return (
              <div className="card" key={pid} style={{ marginBottom: 10 }}>
                <strong>{it.product?.name || it.productName || `Product #${pid}`}</strong>
                <p className="muted" style={{ margin: '4px 0' }}>
                  Qty: {it.quantity} · ${Number(it.product?.price ?? cart.productsTotal?? it.price ?? 0).toFixed(2)}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => changeQty(pid, it.quantity + 1)}>+</button>
                  <button className="btn" onClick={() => changeQty(pid, it.quantity - 1)}>−</button>
                  <button className="btn" onClick={() => removeItem(pid)}>Remove</button>
                </div>
              </div>
            );
          })}
          <div className="card">
            <p>Products total: <strong>${Number(cart.productsTotal ?? cart.subtotal ?? 0).toFixed(2)}</strong></p>
            <p>Delivery fee: <strong>${Number(cart.deliveryFee ?? 0).toFixed(2)}</strong></p>
            <p>Total: <strong>${Number(cart.totalAmount ?? cart.total ?? 0).toFixed(2)}</strong></p>
            <button className="btn btn-primary" onClick={confirm}>Confirm — continue to delivery address</button>
          </div>
        </>
      )}
    </div>
  );
}
