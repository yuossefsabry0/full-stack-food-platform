import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import AdminShell from '../components/AdminShell.jsx';
import styles from './AdminDashboard.module.css';

function listOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.staff)) return d.staff;
  return [];
}

// Single /admin/staff route; ?role=CHEF / ?role=DELIVERY deep-links come from
// the dashboard cards (Chef Management / Delivery Management).
export default function AdminStaff() {
  const [params, setParams] = useSearchParams();
  const role = params.get('role') || '';
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'CHEF' });

  // Backend staff-creation failures carry per-field details ({ field, message })
  // for both validation (400) and taken username/email (409); surface each
  // beneath its own input instead of a single generic line. Details without
  // a matching input fall back to the generic line so nothing is hidden.
  function applyFieldErrors(err) {
    const details = err?.payload?.errors;
    if (!Array.isArray(details) || details.length === 0) return false;
    const mapped = {};
    for (const item of details) {
      if (typeof item === 'string') continue;
      const field = item?.field;
      const message = item?.message;
      if (
        typeof field === 'string' &&
        Object.prototype.hasOwnProperty.call(form, field) &&
        typeof message === 'string' &&
        message &&
        mapped[field] === undefined
      ) {
        mapped[field] = message;
      }
    }
    if (Object.keys(mapped).length === 0) return false;
    setFieldErrors(mapped);
    return true;
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear that field's own message as soon as the admin edits it again.
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function load(r = '') {
    setError('');
    try {
      const res = await api.adminStaff({ role: r || undefined, page: 1, limit: 20 });
      setStaff(listOf(res));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load(role);
  }, [role]);

  async function onAdd(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    try {
      await api.adminAddStaff(form);
      setForm({ name: '', username: '', email: '', password: '', role: 'CHEF' });
      await load(role);
    } catch (err) {
      // Prefer the field-specific message beneath its input; the generic
      // line below stays as the fallback for non-field errors.
      if (!applyFieldErrors(err)) setError(err.message);
    }
  }

  async function toggle(s) {
    setError('');
    try {
      await api.adminEditStaff(s.id, { isActive: !(s.isActive ?? true) });
      await load(role);
    } catch (err) {
      setError(err.message);
    }
  }

  const activeKey = role === 'CHEF' ? 'chef' : role === 'DELIVERY' ? 'delivery' : 'staff';
  const heading = role === 'CHEF' ? 'Chef Management' : role === 'DELIVERY' ? 'Delivery Management' : 'All Staff';

  return (
    <AdminShell active={activeKey} title={heading} sub={`Staff accounts — total ${staff.length}.`}>
        <div className={styles.toolbar} role="toolbar" aria-label="Staff role filter">
          <button className={`${styles.filterBtn} ${role === '' ? styles.filterBtnActive : ''}`} onClick={() => setParams({})}>All</button>
          <button className={`${styles.filterBtn} ${role === 'CHEF' ? styles.filterBtnActive : ''}`} onClick={() => setParams({ role: 'CHEF' })}>Chefs</button>
          <button className={`${styles.filterBtn} ${role === 'DELIVERY' ? styles.filterBtnActive : ''}`} onClick={() => setParams({ role: 'DELIVERY' })}>Delivery</button>
        </div>
        {error && <p className="error">{error}</p>}
        <div className={styles.tableCard} style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>Add staff (CHEF / DELIVERY only — backend blocks ADMIN)</h3>
          <form onSubmit={onAdd}>
            <label className="field">Name<input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
              {fieldErrors.name && <span className="error" role="alert">{fieldErrors.name}</span>}
            </label>
            <label className="field">Username<input className="input" value={form.username} onChange={(e) => set('username', e.target.value)} required />
              {fieldErrors.username && <span className="error" role="alert">{fieldErrors.username}</span>}
            </label>
            <label className="field">Email<input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
              {fieldErrors.email && <span className="error" role="alert">{fieldErrors.email}</span>}
            </label>
            <label className="field">Password<input className="input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required />
              {fieldErrors.password && <span className="error" role="alert">{fieldErrors.password}</span>}
            </label>
            <label className="field">
              Role
              <select className="input" value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="CHEF">CHEF</option>
                <option value="DELIVERY">DELIVERY</option>
              </select>
              {fieldErrors.role && <span className="error" role="alert">{fieldErrors.role}</span>}
            </label>
            <button className="btn btn-primary" type="submit">Add staff</button>
          </form>
        </div>
        {staff.map((s, i) => (
          <div className={styles.tableCard} key={s.id || i} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className={styles.avatar} aria-hidden="true">
                {(s.name || s.username || '?').charAt(0).toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 15 }}>{s.name} ({s.username})</strong>
                  <span className={`${styles.pill} ${styles.pillNeutral}`}>
                    {s.role}
                  </span>
                </div>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>{s.email}</p>
              </div>
            </div>
            <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Internal ID (for edits)</span>
                <strong>{s.id ?? '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">User code</span>
                <strong>{s.userCode || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Status</span>
                <span className={`${styles.pill} ${(s.isActive ?? true) ? styles.pillActive : styles.pillInactive}`}>
                  {(s.isActive ?? true) ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Joined</span>
                <strong>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}</strong>
              </div>
            </div>
            {s.id && <button className="btn" style={{ marginTop: 10 }} onClick={() => toggle(s)} aria-label={`Toggle active for ${s.username}`}>Toggle active</button>}
          </div>
        ))}
        {staff.length === 0 && !error && <p className="muted">No staff found.</p>}
    </AdminShell>
  );
}
