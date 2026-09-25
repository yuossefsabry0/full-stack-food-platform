import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [resetToken, setResetToken] = useState(location.state?.resetToken || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.resetPassword({ email, resetToken, password, confirmPassword });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 440 }}>
      <div className="card">
        <h2>New password</h2>
        <form onSubmit={onSubmit}>
          <label className="field">
            Email
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            Reset token
            <input className="input" value={resetToken} onChange={(e) => setResetToken(e.target.value)} required />
          </label>
          <label className="field">
            New password
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label className="field">
            Confirm password
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit">Set password</button>
        </form>
      </div>
    </div>
  );
}
