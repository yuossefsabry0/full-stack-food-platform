import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { FEATURED_FOODS } from '../assets/foodImages.js';
import styles from './AuthPages.module.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const splitRef = useRef(null);

  // Task 103: same standalone 50/50 split as the sign-up/login pages — pin
  // the layout exactly between the top bar and the viewport bottom (no gap,
  // no page scroll, no empty space). Measures the real rendered bar height.
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
    setMessage('');
    setLoading(true);
    try {
      // Existing recovery flow: email -> one-time code -> verify-otp route.
      const res = await api.forgotPassword({ email });
      setMessage(res.message || 'If the email exists, a code was sent.');
      navigate('/verify-otp', { state: { email } });
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
        <h2 className={styles.regHeroTitle}>Locked out? Let&apos;s fix that.</h2>
        <p className={styles.regHeroText}>
          Enter your account email and we will send you a one-time code to reset your password.
        </p>
        <div className={styles.regRow} aria-hidden="true">
          <img className={styles.regRowDish} src={FEATURED_FOODS[2].src} alt="" loading="lazy" />
          <img className={styles.regRowDish} src={FEATURED_FOODS[4].src} alt="" loading="lazy" />
          <img className={styles.regRowDish} src={FEATURED_FOODS[5].src} alt="" loading="lazy" />
        </div>
      </div>
      <div className={styles.regFormHalf}>
        <div className={styles.formSide}>
          <h2 className={styles.formTitle}>Forgot password</h2>
          <p className={styles.formSub}>We&apos;ll email you a one-time code.</p>
          <form onSubmit={onSubmit}>
            <label className="field">
              Email
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            {message && <p className="muted" role="status">{message}</p>}
            <button className={`btn btn-primary btn-lg ${loading ? 'is-loading' : ''}`} disabled={loading} type="submit" style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
          <p className={styles.authSwitch}>
            <Link to="/login">Back to login</Link>
          </p>
          <p className={styles.centerNote}>
            For your security, we always show the same message whether or not the email is registered.
          </p>
        </div>
      </div>
    </div>
  );
}
