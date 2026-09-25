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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {items.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card">
              {p.imageUrl || p.image ? (
                <img src={p.imageUrl || p.image} alt={p.name} style={{ borderRadius: 8, height: 140, width: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ borderRadius: 8, height: 140, background: 'linear-gradient(135deg,#e0e7ff,#fef3c7)' }} />
              )}
              <h3 style={{ margin: '10px 0 4px' }}>{p.name}</h3>
              <p className="muted" style={{ margin: 0 }}>${Number(p.price).toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </div>
      {!loading && !error && items.length === 0 && <p className="muted">No dishes found.</p>}
    </div>
  );
}
