import React, { useState } from 'react';
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
    <div className="page">
      <div className={styles.stage}>
        <div className={`${styles.card} ${styles.compact}`}>
          <div className={styles.panel}>
            <span className={styles.panelBrand}>
              <span className={styles.panelBrandMark} aria-hidden="true">J</span>
              Joo food
            </span>
            <h2 className={styles.panelTitle}>Join Joo Food in seconds.</h2>
            <p className={styles.panelText}>
              Create your account and get hot meals delivered — browse the menu, check out in a tap, and follow every order live.
            </p>
            <div className={styles.panelArt} aria-hidden="true">
              <img src={HERO_IMAGE.src} alt="" loading="lazy" />
              {FEATURED_FOODS.slice(2, 4).map((f) => (
                <img key={f.caption} src={f.src} alt="" loading="lazy" />
              ))}
            </div>
          </div>
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
    </div>
  );
}
