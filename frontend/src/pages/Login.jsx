import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { FEATURED_FOODS } from '../assets/foodImages.js';
import styles from './AuthPages.module.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const splitRef = useRef(null);

  // Task 102: same standalone 50/50 split as the sign-up page — pin the
  // layout exactly between the top bar and the viewport bottom (no gap, no
  // page scroll, no empty space). Measures the real rendered bar height.
  useEffect(() => {
    function fit() {
      try {
        const bar = document.querySelector('header');
        const h = bar ? Math.round(bar.getBoundingClientRect().height) : 61;
        if (splitRef.current && h > 0) {
          splitRef.current.style.top = `${h}px`;
        }
      } catch {
        // CSS fallback offset stays in effect
      }
    }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

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
    <div className={styles.regSplit} ref={splitRef}>
      <div className={styles.regHero}>
        <span className={styles.regHeroRing} aria-hidden="true" />
        <span className={styles.panelBrand}>
          <span className={styles.panelBrandMark} aria-hidden="true">J</span>
          Joo food
        </span>
        <h2 className={styles.regHeroTitle}>Welcome back, hungry?</h2>
        <p className={styles.regHeroText}>
          Log in to browse the menu, fill your cart, and track every order from kitchen to door.
        </p>
        <span className={styles.regPill}>Delivered in ~30 mins</span>
        <div className={styles.regArt} aria-hidden="true">
          <img className={`${styles.regDish} ${styles.regDishSide}`} src={FEATURED_FOODS[1].src} alt="" loading="lazy" />
          <img className={`${styles.regDish} ${styles.regDishSmall}`} src={FEATURED_FOODS[4].src} alt="" loading="lazy" />
          <img className={`${styles.regDish} ${styles.regDishMain}`} src={FEATURED_FOODS[0].src} alt="" loading="lazy" />
          <span className={styles.regBadge}>
            <span aria-hidden="true" style={{ color: '#f59e0b', fontSize: 13 }}>★</span>
            4.9 · 12k happy customers
          </span>
        </div>
      </div>
      <div className={styles.regFormHalf}>
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
  );
}
