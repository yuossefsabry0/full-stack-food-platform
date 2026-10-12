import React from 'react';
import { retryHint } from '../api/errors.js';

// Reusable inline error notice (additive): renders the backend message +
// optional code, validation details, and 429 Retry-After hint.
// Props: error (string|Error|formatted object), onDismiss?, compact?
export default function ErrorNotice({ error, onDismiss, compact = false }) {
  if (!error) return null;
  const formatted =
    typeof error === 'string'
      ? { message: error, code: '', details: [], retryAfterSec: null }
      : error.message
        ? error
        : { message: 'Something went wrong.', code: '', details: [], retryAfterSec: null };
  return (
    <div className={compact ? 'error-notice is-compact' : 'error-notice'} role="alert">
      <div className="error-notice-body">
        <p className="error-notice-message">{formatted.message}</p>
        {formatted.code && <p className="error-notice-code">Code: {formatted.code}{retryHint(formatted.retryAfterSec)}</p>}
        {!formatted.code && formatted.retryAfterSec ? (
          <p className="error-notice-code">Too many requests.{retryHint(formatted.retryAfterSec)}</p>
        ) : null}
        {Array.isArray(formatted.details) && formatted.details.length > 0 && (
          <ul className="error-notice-details">
            {formatted.details.slice(0, 5).map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button type="button" className="error-notice-dismiss" onClick={onDismiss} aria-label="Dismiss error">
          ×
        </button>
      )}
    </div>
  );
}
