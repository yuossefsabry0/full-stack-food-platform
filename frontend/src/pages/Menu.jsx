import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

function unwrapList(res) {
  const data = res?.data;
  if (Array.isArray(data)) return { items: data, meta: res?.meta };
  if (Array.isArray(data?.items)) return { items: data.items, meta: data.meta || res?.meta };
  if (Array.isArray(data?.products)) return { items: data.products, meta: data.meta || res?.meta };
  return { items: [], meta: res?.meta };
}

export default function Menu() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(q = '') {
    setLoading(true);
    setError('');
    try {
      const res = await api.menu({ search: q || undefined, page: 1, limit: 24 });
      setItems(unwrapList(res).items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <h2>Menu</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
        style={{ display: 'flex', gap: 8, marginBottom: 16 }}
      >
        <input
          className="input"
          placeholder="Search dishes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Search</button>
      </form>
      {loading && <p className="muted">Loading menu…</p>}
      {error && <p className="error">{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, alignItems: 'stretch' }}>
        {items.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {p.imageUrl || p.image ? (
                <div style={{ borderRadius: 8, overflow: 'hidden', width: '100%', aspectRatio: '4 / 3', background: '#f1f5f9', flexShrink: 0 }}>
                  <img
                    src={p.imageUrl || p.image}
                    alt={p.name}
                    loading="lazy"
                    style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div style={{ borderRadius: 8, width: '100%', aspectRatio: '4 / 3', background: 'linear-gradient(135deg,#e0e7ff,#fef3c7)', flexShrink: 0 }} />
              )}
              <h3
                style={{
                  margin: '10px 0 4px',
                  fontSize: 16,
                  lineHeight: 1.35,
                  minHeight: '2.7em',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {p.name}
              </h3>
              <p
                className="muted"
                style={{
                  margin: '0 0 4px',
                  fontSize: 13,
                  lineHeight: 1.45,
                  minHeight: '2.9em',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {p.description || ' '}
              </p>
              <p className="muted" style={{ margin: 'auto 0 0', paddingTop: 4, fontFamily: 'inherit', fontWeight: 700, color: '#1f2937' }}>${Number(p.price).toFixed(2)}</p>
              <span
                className="btn btn-primary"
                aria-hidden="true"
                style={{ display: 'block', width: '100%', textAlign: 'center', borderRadius: 8, padding: '10px 14px', fontWeight: 600, fontSize: 14, marginTop: 10 }}
              >
                View Details
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!loading && !error && items.length === 0 && <p className="muted">No dishes found.</p>}
    </div>
  );
}
