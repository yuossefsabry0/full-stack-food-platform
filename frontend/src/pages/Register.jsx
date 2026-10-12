import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { HERO_IMAGE, FEATURED_FOODS } from '../assets/foodImages.js';
import styles from './AuthPages.module.css';

// Client-side strength hint only (visual feedback mirroring the documented
// policy: 8+ chars with a letter and a number). The backend remains the
// authority and still rejects weak passwords with a 400.
function strengthOf(password) {
  if (!password) return { width: '0%', color: '#e7e5e4', label: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (password.length >= 12) score += 1;
  if (score <= 1) return { width: '33%', color: '#dc2626', label: 'Weak — use 8+ characters with a letter and a number.' };
  if (score === 2) return { width: '66%', color: '#ea580c', label: 'Good — add a couple more characters for extra strength.' };
  return { width: '100%', color: '#16a34a', label: 'Strong password.' };
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const strength = strengthOf(form.password);
  const splitRef = useRef(null);

  // Task 101: pin the split exactly between the top bar and the viewport
  // bottom (no gap, no page scroll, no empty space). Measures the real
  // rendered bar height and sets the fixed offset; falls back to the CSS
  // default when unavailable.
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

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Always BASIC per backend (role field is rejected server-side).
      // Only the four backend fields are submitted.
      await api.register({ name: form.name, username: form.username, email: form.email, password: form.password });
      navigate('/login', { replace: true });
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
        <h2 className={styles.regHeroTitle}>Join Joo Food in seconds.</h2>
        <p className={styles.regHeroText}>
          Create your account and get hot meals delivered — browse the menu, check out in a tap, and follow every order live.
        </p>
        <span className={styles.regPill}>Sign up in under a minute</span>
        <div className={styles.regArt} aria-hidden="true">
          <img className={`${styles.regDish} ${styles.regDishSide}`} src={FEATURED_FOODS[2].src} alt="" loading="lazy" />
          <img className={`${styles.regDish} ${styles.regDishSmall}`} src={FEATURED_FOODS[4].src} alt="" loading="lazy" />
          <img className={`${styles.regDish} ${styles.regDishMain}`} src={HERO_IMAGE.src} alt="" loading="lazy" />
          <span className={styles.regBadge}>
            <span className={styles.regBadgeDot} />
            Secure &amp; private account
          </span>
        </div>
      </div>
      <div className={`${styles.regFormHalf} ${styles.compact}`}>
        <div className={styles.formSide}>
          <h2 className={styles.formTitle}>Create account</h2>
          <p className={styles.formSub}>Fill in your details to get started.</p>
          <form onSubmit={onSubmit}>
            <label className="field">
              Name
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required autoComplete="name" />
            </label>
            <label className="field">
              Username
              <input className="input" value={form.username} onChange={(e) => set('username', e.target.value)} required autoComplete="username" />
            </label>
            <label className="field">
              Email
              <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required autoComplete="email" />
            </label>
            <label className="field">
              Password
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
                autoComplete="new-password"
                aria-describedby="password-strength"
              />
              <span className={styles.strength} aria-hidden="true">
                <span className={styles.strengthBar} style={{ width: strength.width, background: strength.color }} />
              </span>
              {strength.label && (
                <span className={styles.strengthHint} id="password-strength" role="status">
                  {strength.label}
                </span>
              )}
            </label>
            <label className={styles.terms}>
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required />
              <span>I agree to the Terms of Service and Privacy Policy.</span>
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button
              className={`btn btn-primary btn-lg ${loading ? 'is-loading' : ''}`}
              disabled={loading || !accepted}
              type="submit"
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>
          <p className={styles.authSwitch}>
            Already have an account?
            <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
