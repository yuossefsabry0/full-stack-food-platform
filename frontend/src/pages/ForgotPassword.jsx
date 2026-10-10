import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { HERO_IMAGE, FEATURED_FOODS } from '../assets/foodImages.js';
import styles from './AuthPages.module.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="page">
      <div className={styles.stage}>
        <div className={styles.card}>
          <div className={styles.panel}>
            <span className={styles.panelBrand}>
              <span className={styles.panelBrandMark} aria-hidden="true">J</span>
              Joo food
            </span>
            <h2 className={styles.panelTitle}>Locked out? Let&apos;s fix that.</h2>
            <p className={styles.panelText}>
              Enter your account email and we will send you a one-time code to reset your password.
            </p>
            <div className={styles.panelArt} aria-hidden="true">
              <img src={HERO_IMAGE.src} alt="" loading="lazy" />
              {FEATURED_FOODS.slice(4, 6).map((f) => (
                <img key={f.caption} src={f.src} alt="" loading="lazy" />
              ))}
            </div>
          </div>
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
    </div>
  );
}
