'use strict';

const env = require('../config/env');


function isOtpDevExposeEnabled() {
  return (
    process.env.OTP_DEV_EXPOSE === 'true' &&
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
  );
}

async function sendOtpEmail({ toEmail, otp, expiresInMinutes }) {
  if (isOtpDevExposeEnabled()) {
    // eslint-disable-next-line no-console
    console.log(
      `[dev-mailer] Password-reset OTP for ${toEmail}: ${otp} (expires in ${expiresInMinutes} minutes)`
    );
  }
  // Optional HTTP email hook (no new dependencies): when EMAIL_HTTP_ENDPOINT
  // is set, POST { to, subject, text } (Bearer EMAIL_API_KEY when set).
  // Any failure is logged by the caller; the response stays generic so the
  // existence of an account is never revealed via delivery status.
  const endpoint = process.env.EMAIL_HTTP_ENDPOINT || '';
  if (endpoint) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (process.env.EMAIL_API_KEY) headers.Authorization = `Bearer ${process.env.EMAIL_API_KEY}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: toEmail,
            subject: 'Your password reset code',
            text: `Your code is ${otp}. It expires in ${expiresInMinutes} minutes.`,
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`provider status ${res.status}`);
        return { delivered: true, channel: 'http-hook' };
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`OTP email delivery failed for ${toEmail}:`, err && err.message);
      return { delivered: false, channel: 'http-hook' };
    }
  }
  // Read NODE_ENV live: src/config/env caches nodeEnv at import, but tests
  // toggle NODE_ENV per case and production must never silently claim delivery.
  const liveEnv = process.env.NODE_ENV || env.nodeEnv;
  if (liveEnv === 'production') {
    // eslint-disable-next-line no-console
    console.error(`OTP email not configured (EMAIL_HTTP_ENDPOINT unset); code for ${toEmail} was not sent.`);
    return { delivered: false, channel: 'unconfigured' };
  }
  return { delivered: true, channel: 'dev-log' };
}

module.exports = { sendOtpEmail };
