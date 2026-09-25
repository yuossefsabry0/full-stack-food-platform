import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api
      .productDetails(id)
      .then((res) => setProduct(res.data?.product || res.data))
      .catch((err) => setError(err.message));
  }, [id]);

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
      <button className="btn" onClick={() => navigate('/menu')}>← Menu</button>
      <div className="card" style={{ marginTop: 12 }}>
        {product.imageUrl || product.image ? (
          <img src={product.imageUrl || product.image} alt={product.name} style={{ borderRadius: 8, maxHeight: 320, width: '100%', objectFit: 'cover' }} />
        ) : null}
        <h2>{product.name}</h2>
        <p><strong>${Number(product.price).toFixed(2)}</strong></p>
        {product.description && <p className="muted">{product.description}</p>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <input
            className="input"
            style={{ maxWidth: 90 }}
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          />
          <button className="btn btn-primary" onClick={addToCart}>Add to Cart</button>
        </div>
        {notice && <p className="muted">{notice}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
