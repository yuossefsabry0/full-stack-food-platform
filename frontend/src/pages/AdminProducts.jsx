import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { ADMIN_LINKS, RoleHeader } from '../components/RoleHeader.jsx';

function listOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.products)) return d.products;
  return [];
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', price: '', description: '', imageUrl: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', description: '', imageUrl: '' });

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

  return (
    <>
      <RoleHeader title="Joo Food · Admin" links={ADMIN_LINKS} />
      <div className="page">
        <h2>Products</h2>
        {error && <p className="error">{error}</p>}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Add product</h3>
          <form onSubmit={onAdd}>
            <label className="field">Name<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="field">Price<input className="input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
            <label className="field">Description<input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="field">Image URL<input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></label>
            <button className="btn btn-primary" type="submit">Add</button>
          </form>
        </div>
        {products.map((p) => (
          <div className="card" key={p.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {(p.imageUrl || p.image) ? (
                <img
                  src={p.imageUrl || p.image}
                  alt={p.name}
                  style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg,#e0e7ff,#fef3c7)', flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 15 }}>{p.name}</strong>
                  <span
                    style={{
                      display: 'inline-block',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 999,
                      padding: '4px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1f2937',
                    }}
                  >
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {p.description && (
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    {p.description}
                  </p>
                )}
              </div>
            </div>
            <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Price</span>
                <strong>${Number(p.price).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">SKU</span>
                <strong>{p.sku || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Product ID</span>
                <strong>#{p.id}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => toggle(p)}>
                {p.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button className="btn" onClick={() => startEdit(p)}>Edit</button>
            </div>
            {editingId === p.id && (
              <form
                style={{ marginTop: 12 }}
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
            )}
          </div>
        ))}
      </div>
    </>
  );
}
