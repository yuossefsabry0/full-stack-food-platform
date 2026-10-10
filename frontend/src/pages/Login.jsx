import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { HERO_IMAGE, FEATURED_FOODS } from '../assets/foodImages.js';
import styles from './AuthPages.module.css';

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
    <div className="page">
      <div className={styles.stage}>
        <div className={styles.card}>
          <div className={styles.panel}>
            <span className={styles.panelBrand}>
              <span className={styles.panelBrandMark} aria-hidden="true">J</span>
              Joo food
            </span>
            <h2 className={styles.panelTitle}>Welcome back, hungry?</h2>
            <p className={styles.panelText}>
              Log in to browse the menu, fill your cart, and track every order from kitchen to door.
            </p>
            <div className={styles.panelArt} aria-hidden="true">
              <img src={HERO_IMAGE.src} alt="" loading="lazy" />
              {FEATURED_FOODS.slice(0, 2).map((f) => (
                <img key={f.caption} src={f.src} alt="" loading="lazy" />
              ))}
            </div>
          </div>
          <div className={styles.formSide}>
            <h2 className={styles.formTitle}>Log in</h2>
            <p className={styles.formSub}>Enter your details to continue.</p>
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
              <button className={`btn btn-primary btn-lg ${loading ? 'is-loading' : ''}`} disabled={loading} type="submit" style={{ width: '100%', marginTop: 8 }}>
                {loading ? 'Logging in…' : 'Log in'}
              </button>
            </form>
            <p className={styles.authSwitch}>
              No account?
              <Link to="/register">Create account</Link>
            </p>
            <p className={styles.authSwitch}>
              <Link to="/forgot-password">Forgot password?</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
