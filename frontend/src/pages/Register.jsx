import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Always BASIC per backend (role field is rejected server-side).
      await api.register(form);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 480 }}>
      <div className="card">
        <h2>Create account</h2>
        <form onSubmit={onSubmit}>
          <label className="field">
            Name
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </label>
          <label className="field">
            Username
            <input className="input" value={form.username} onChange={(e) => set('username', e.target.value)} required />
          </label>
          <label className="field">
            Email
            <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </label>
          <label className="field">
            Password
            <input className="input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? 'Creating…' : 'Register'}
          </button>
        </form>
        <p className="muted" style={{ fontSize: 14 }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
