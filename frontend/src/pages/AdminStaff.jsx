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
            <strong>{s.name} ({s.username})</strong>
            <p className="muted">{s.role} · {s.email}</p>
            {s.id && <button className="btn" onClick={() => toggle(s)}>Toggle active</button>}
          </div>
        ))}
        {staff.length === 0 && !error && <p className="muted">No staff found.</p>}
      </div>
    </>
  );
}
