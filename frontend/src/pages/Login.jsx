import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      // Role-based landing, mirroring backend navigation.next:
      // ADMIN -> /admin dashboard, others -> /home.
      if (user?.role === 'ADMIN') navigate('/admin', { replace: true });
      else if (user?.role === 'CHEF') navigate('/chef/requests', { replace: true });
      else if (user?.role === 'DELIVERY') navigate('/delivery/current', { replace: true });
      else navigate('/home', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 460, minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', padding: 28, boxShadow: '0 12px 32px rgba(16, 24, 40, 0.10)' }}>
        <p className="muted" style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: 0.4 }}>Joo Food</p>
        <h2 style={{ margin: '4px 0 4px', fontSize: 24 }}>Welcome back</h2>
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 14 }}>Log in to continue to your account.</p>
        <form onSubmit={onSubmit}>
          <label className="field">
            Username
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          </label>
          <label className="field">
            Password
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary" disabled={loading} type="submit" style={{ width: '100%', marginTop: 6 }}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <Link
            to="/register"
            style={{ flex: 1, textAlign: 'center', textDecoration: 'none', border: '1px solid #e5e7eb', borderRadius: 999, padding: '9px 14px', fontSize: 14, fontWeight: 600, color: '#111827', background: '#f8fafc', minWidth: 140 }}
          >
            Create account
          </Link>
          <Link
            to="/forgot-password"
            style={{ flex: 1, textAlign: 'center', textDecoration: 'none', border: '1px solid transparent', borderRadius: 999, padding: '9px 14px', fontSize: 14, fontWeight: 600, color: '#4b5563', background: 'transparent', minWidth: 140 }}
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
