import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { getMaxQuantity, MAX_QUANTITY_FALLBACK } from '../api/cartConfig.js';
import sf from './Storefront.module.css';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
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
    setAdding(true);
    try {
      await api.cartAdd({ productId: Number(id), quantity });
      setNotice('Added to cart.');
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  if (error && !product) {
    return (
      <div className={sf.page}>
        <p className="error" role="alert">{error}</p>
        <button className="btn" onClick={() => navigate('/menu')}>Back to Menu</button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={sf.page}>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const image = product.imageUrl || product.image;
  const lineTotal = Number(product.price) * (Number(quantity) || 1);

  return (
    <div className={sf.page}>
      <span className={sf.pageLabel}>
        <span className={sf.pageLabelDot} aria-hidden="true" />
        Product Details
      </span>
      <div style={{ marginTop: 12 }}>
        <button className={sf.ctaGhost} onClick={() => navigate('/menu')} style={{ border: '1px solid #f0e7da' }}>
          ← Menu
        </button>
      </div>
      <div className={sf.columns} style={{ gridTemplateColumns: '1.1fr 1fr', marginTop: 16 }}>
        <div className={sf.panel} style={{ padding: 16 }}>
          {image ? (
            <div style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: '1 / 1', background: 'linear-gradient(135deg,#ffedd5,#fecaca)' }}>
              <img
                src={image}
                alt={product.name}
                loading="lazy"
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div
              aria-hidden="true"
              style={{ borderRadius: 18, aspectRatio: '1 / 1', background: 'linear-gradient(135deg,#ffedd5,#fecaca)' }}
            />
          )}
        </div>
        <div className={sf.panel}>
          <p className={sf.heroEyebrow} style={{ marginBottom: 4 }}>Dish</p>
          <h2 style={{ margin: '0 0 6px', fontSize: 28, color: '#1c1917' }}>{product.name}</h2>
          <p style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#ea580c' }}>
            ${Number(product.price).toFixed(2)}
          </p>
          {product.description && (
            <p style={{ margin: '0 0 4px', fontSize: 14, lineHeight: 1.6, color: '#57534e' }}>{product.description}</p>
          )}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <div className="qty qty-lg" role="group" aria-label="Select quantity">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, (Number(q) || 1) - 1))}
              >
                −
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={quantity >= maxQuantity}
                onClick={() => setQuantity((q) => Math.min(maxQuantity, (Number(q) || 1) + 1))}
              >
                +
              </button>
            </div>
            <span className="muted" style={{ fontSize: 12.5 }}>Max {maxQuantity} per order</span>
          </div>
          <button
            className={`btn btn-primary btn-lg ${adding ? 'is-loading' : ''}`}
            onClick={addToCart}
            disabled={adding}
            style={{ width: '100%', marginTop: 16, justifyContent: 'space-between', paddingLeft: 22, paddingRight: 22 }}
          >
            <span>{adding ? 'Adding…' : 'Add to cart'}</span>
            <span>${lineTotal.toFixed(2)}</span>
          </button>
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
              }}
            >
              <span aria-hidden="true">✓</span>
              {notice}
            </p>
          )}
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
