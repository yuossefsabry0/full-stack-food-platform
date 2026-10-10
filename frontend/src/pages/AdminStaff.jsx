import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { ADMIN_LINKS, RoleHeader } from '../components/RoleHeader.jsx';

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
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'CHEF' });

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
    try {
      await api.adminAddStaff(form);
      setForm({ name: '', username: '', email: '', password: '', role: 'CHEF' });
      await load(role);
    } catch (err) {
      setError(err.message);
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

  return (
    <>
      <RoleHeader title="Joo Food · Admin" links={ADMIN_LINKS} />
      <div className="page">
        <h2>{role === 'CHEF' ? 'Chef Management' : role === 'DELIVERY' ? 'Delivery Management' : 'Staff'}</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn" onClick={() => setParams({})}>All</button>
          <button className="btn" onClick={() => setParams({ role: 'CHEF' })}>Chefs</button>
          <button className="btn" onClick={() => setParams({ role: 'DELIVERY' })}>Delivery</button>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Add staff (CHEF / DELIVERY only — backend blocks ADMIN)</h3>
          <form onSubmit={onAdd}>
            <label className="field">Name<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="field">Username<input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
            <label className="field">Email<input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label className="field">Password<input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
            <label className="field">
              Role
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="CHEF">CHEF</option>
                <option value="DELIVERY">DELIVERY</option>
              </select>
            </label>
            <button className="btn btn-primary" type="submit">Add staff</button>
          </form>
        </div>
        {staff.map((s, i) => (
          <div className="card" key={s.id || i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                aria-hidden="true"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#111827',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {(s.name || s.username || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 15 }}>{s.name} ({s.username})</strong>
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
                    {s.role}
                  </span>
                </div>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>{s.email}</p>
              </div>
            </div>
            <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">User code</span>
                <strong>{s.userCode || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Status</span>
                <strong>{(s.isActive ?? true) ? 'Active' : 'Inactive'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted">Joined</span>
                <strong>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}</strong>
              </div>
            </div>
            {s.id && <button className="btn" style={{ marginTop: 10 }} onClick={() => toggle(s)}>Toggle active</button>}
          </div>
        ))}
        {staff.length === 0 && !error && <p className="muted">No staff found.</p>}
      </div>
    </>
  );
}
