import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { getMaxQuantity, MAX_QUANTITY_FALLBACK } from '../api/cartConfig.js';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [maxQuantity, setMaxQuantity] = useState(MAX_QUANTITY_FALLBACK);

  useEffect(() => {
    api
      .productDetails(id)
      .then((res) => setProduct(res.data?.product || res.data))
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    getMaxQuantity().then(setMaxQuantity);
  }, []);

  async function addToCart() {
    setError('');
    setNotice('');
    try {
      await api.cartAdd({ productId: Number(id), quantity });
      setNotice('Added to cart.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !product) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <button className="btn" onClick={() => navigate('/menu')}>Back to Menu</button>
      </div>
    );
  }

  if (!product) return <div className="page"><p className="muted">Loading…</p></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <button
          className="btn"
          onClick={() => navigate('/menu')}
          style={{
            flexShrink: 0,
            whiteSpace: 'nowrap',
            borderRadius: 10,
            padding: '10px 18px',
            fontWeight: 700,
            fontSize: 14,
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#111827',
            boxShadow: '0 1px 2px rgba(16, 24, 40, 0.06)',
          }}
        >
          ← Menu
        </button>
        <div
          className="card"
          style={{
            marginTop: 0,
            flex: 1,
            minWidth: 0,
            padding: 20,
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            background: '#fff',
            boxShadow: '0 4px 16px rgba(16, 24, 40, 0.08)',
          }}
        >
        {product.imageUrl || product.image ? (
          <div style={{ borderRadius: 12, overflow: 'hidden', width: '100%', aspectRatio: '16 / 10', background: '#f1f5f9' }}>
            <img
              src={product.imageUrl || product.image}
              alt={product.name}
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : null}
        <h2 style={{ margin: '14px 0 4px', fontSize: 22, lineHeight: 1.25, fontWeight: 800, color: '#111827' }}>{product.name}</h2>
        <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#111827' }}>${Number(product.price).toFixed(2)}</p>
        {product.description && (
          <p style={{ margin: '0 0 4px', fontSize: 14, lineHeight: 1.6, color: '#4b5563' }}>{product.description}</p>
        )}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <div
            role="group"
            aria-label="Select quantity"
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
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, (Number(q) || 1) - 1))}
              style={{
                width: 36,
                height: 36,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#fff',
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1,
                color: '#111827',
                cursor: 'pointer',
                opacity: quantity <= 1 ? 0.4 : 1,
              }}
            >
              −
            </button>
            <span
              aria-live="polite"
              style={{
                minWidth: 48,
                textAlign: 'center',
                fontWeight: 700,
                fontSize: 16,
                fontVariantNumeric: 'tabular-nums',
                userSelect: 'none',
                color: '#1f2937',
              }}
            >
              {quantity}
            </span>
            <button
              className="btn"
              type="button"
              aria-label="Increase quantity"
              disabled={quantity >= maxQuantity}
              onClick={() => setQuantity((q) => Math.min(maxQuantity, (Number(q) || 1) + 1))}
              style={{
                width: 36,
                height: 36,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: '1px solid #111827',
                background: '#111827',
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1,
                color: '#fff',
                cursor: 'pointer',
                opacity: quantity >= 99 ? 0.4 : 1,
              }}
            >
              +
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={addToCart}
            style={{ borderRadius: 999, padding: '10px 22px', fontWeight: 600, fontSize: 14 }}
          >
            Add to Cart
          </button>
        </div>
        {notice && (
          <p
            role="status"
            style={{
              margin: '12px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#ecfdf5',
              border: '1px solid #6ee7b7',
              borderLeft: '4px solid #10b981',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#065f46',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 1px 2px rgba(6, 95, 70, 0.12)',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16, fontWeight: 700 }}>✓</span>
            {notice}
          </p>
        )}
        {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
