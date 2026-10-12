import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import AdminShell from '../components/AdminShell.jsx';
import styles from './AdminDashboard.module.css';

function listOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.products)) return d.products;
  return [];
}

// Pastel tile backgrounds for cards without a photo (cycles by product id).
const TILE_BG = ['#fce7f3', '#ede9fe', '#fef3c7', '#dcfce7', '#ffedd5'];

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', price: '', description: '', imageUrl: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', description: '', imageUrl: '' });
  // Presentational-only client-side filtering of the already-loaded catalog
  // (no new requests, no API change): text search + status pills.
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  async function load() {
    setError('');
    try {
      const res = await api.adminProducts({ page: 1, limit: 20 });
      setProducts(listOf(res));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.adminAddProduct({ ...form, price: Number(form.price) });
      setForm({ name: '', price: '', description: '', imageUrl: '' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(p) {
    setError('');
    try {
      await api.adminEditProduct(p.id, { isActive: !p.isActive });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(p) {
    setError('');
    setEditingId(p.id);
    setEditForm({
      name: p.name || '',
      price: p.price ?? '',
      description: p.description || '',
      imageUrl: p.imageUrl || p.image || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: '', price: '', description: '', imageUrl: '' });
  }

  async function saveEdit(id) {
    setError('');
    try {
      // Backend schema is strict + partial: send only known keys, and map
      // blank description/image to null (empty strings would fail validation).
      await api.adminEditProduct(id, {
        name: editForm.name,
        price: Number(editForm.price),
        description: editForm.description === '' ? null : editForm.description,
        imageUrl: editForm.imageUrl === '' ? null : editForm.imageUrl,
      });
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Derived view of the loaded catalog (presentational only — `products`
  // itself is still set exclusively by load()).
  const visible = products.filter((p) => {
    if (statusFilter === 'active' && !p.isActive) return false;
    if (statusFilter === 'inactive' && p.isActive) return false;
    const q = query.trim().toLowerCase();
    if (q && !(p.name || '').toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <AdminShell
      active="products"
      title="Products"
      sub="View, add, edit, activate or deactivate menu products."
      actions={(
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => document.getElementById('admin-add-product')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          + Add product
        </button>
      )}
    >
        <p className={styles.crumb}>
          <span>Dashboard</span>
          <span aria-hidden="true"> / </span>
          <span>Products</span>
        </p>
        {error && <p className="error">{error}</p>}
        <div className={styles.searchRow}>
          <input
            className={`input ${styles.searchInput}`}
            type="search"
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products by name"
          />
        </div>
        <div className={styles.toolbar} role="toolbar" aria-label="Product filters">
          {[
            { key: 'all', label: `All (${products.length})` },
            { key: 'active', label: `Active (${products.filter((p) => p.isActive).length})` },
            { key: 'inactive', label: `Inactive (${products.filter((p) => !p.isActive).length})` },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.filterBtn} ${statusFilter === f.key ? styles.filterBtnActive : ''}`}
              onClick={() => setStatusFilter(f.key)}
              aria-pressed={statusFilter === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className={styles.tableCard} id="admin-add-product" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>Add product</h3>
          <form onSubmit={onAdd}>
            <label className="field">Name<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="field">Price<input className="input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
            <label className="field">Description<input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="field">Image URL<input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></label>
            <button className="btn btn-primary" type="submit">Add</button>
          </form>
        </div>
        <div className={styles.prodGrid}>
          {visible.map((p) => (
            <article className={styles.prodCard} key={p.id}>
              <div className={styles.prodTile} style={{ background: TILE_BG[Math.abs(p.id) % TILE_BG.length] }}>
                {(p.imageUrl || p.image) ? (
                  <img src={p.imageUrl || p.image} alt={p.name} loading="lazy" />
                ) : (
                  <span aria-hidden="true" className={styles.prodInitial}>
                    {(p.name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className={styles.prodBody}>
                <h3 className={styles.prodName}>{p.name}</h3>
                {p.description && (
                  <p className={styles.prodDesc}>{p.description}</p>
                )}
                <div className={styles.prodMeta}>
                  <strong className={styles.prodPrice}>${Number(p.price).toFixed(2)}</strong>
                  <span className={`${styles.pill} ${p.isActive ? styles.pillActive : styles.pillInactive}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className={styles.prodFoot}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!p.isActive}
                    aria-label={`${p.isActive ? 'Deactivate' : 'Activate'} ${p.name}`}
                    className={`${styles.switch} ${p.isActive ? styles.switchOn : ''}`}
                    onClick={() => toggle(p)}
                  >
                    <span aria-hidden="true" className={styles.knob} />
                  </button>
                  <button type="button" className={styles.editLink} onClick={() => startEdit(p)}>
                    Edit
                  </button>
                </div>
              </div>
              {editingId === p.id && (
                <div className={styles.prodEdit}>
                  <p className="muted" style={{ margin: '0 0 8px', fontSize: 12 }}>
                    SKU {p.sku || '—'} · Product ID #{p.id}
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveEdit(p.id);
                    }}
                  >
                    <label className="field">Name<input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></label>
                    <label className="field">Price<input className="input" type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} required /></label>
                    <label className="field">Description<input className="input" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></label>
                    <label className="field">Image URL<input className="input" value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} /></label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" type="submit">Save</button>
                      <button className="btn" type="button" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}
            </article>
          ))}
        </div>
        {visible.length === 0 && !error && <p className="muted">No products match the current search or filter.</p>}
    </AdminShell>
  );
}
