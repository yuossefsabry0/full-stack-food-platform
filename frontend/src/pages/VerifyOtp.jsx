import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      // Correct OTP -> backend returns single-use resetToken.
      const res = await api.verifyOtp({ email, otp });
      const resetToken = res.data?.resetToken;
      navigate('/reset-password', { state: { email, resetToken } });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 440 }}>
      <div className="card">
        <h2>Verify code</h2>
        <form onSubmit={onSubmit}>
          <label className="field">
            Email
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            6-digit code
            <input className="input" value={otp} onChange={(e) => setOtp(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit">Verify</button>
        </form>
      </div>
    </div>
  );
}
