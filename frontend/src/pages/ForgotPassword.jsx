import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await api.forgotPassword({ email });
      setMessage(res.message || 'If the email exists, a code was sent.');
      navigate('/verify-otp', { state: { email } });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 440 }}>
      <div className="card">
        <h2>Forgot password</h2>
        <form onSubmit={onSubmit}>
          <label className="field">
            Email
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          {message && <p className="muted">{message}</p>}
          <button className="btn btn-primary" type="submit">Send code</button>
        </form>
        <p className="muted" style={{ fontSize: 14 }}><Link to="/login">Back to login</Link></p>
      </div>
    </div>
  );
}
