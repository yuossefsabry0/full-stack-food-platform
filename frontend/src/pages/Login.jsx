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
    <div className="page" style={{ maxWidth: 440 }}>
      <div className="card">
        <h2>Login</h2>
        <form onSubmit={onSubmit}>
          <label className="field">
            Username
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label className="field">
            Password
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
        <p className="muted" style={{ fontSize: 14 }}>
          No account? <Link to="/register">Register</Link> · <Link to="/forgot-password">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}
