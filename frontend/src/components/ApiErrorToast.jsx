import React, { useEffect, useState } from 'react';
import { formatApiError, retryHint } from '../api/errors.js';

// Global toast (additive): listens for 'fp:api-error' dispatched by
// apiFetch on every non-OK response. Existing per-page setError(err.message)
// handlers keep working unchanged; this toast is a second, dismissible
// surface so errors are visible even where a page swallows them.
export default function ApiErrorToast() {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    function onError(e) {
      const formatted = formatApiError(e?.detail);
      // Skip silent background probes: guest browse + refresh/login 401s
      // already have dedicated handling in client.js.
      if (formatted.status === 401) return;
      setNotice(formatted);
    }
    window.addEventListener('fp:api-error', onError);
    return () => window.removeEventListener('fp:api-error', onError);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!notice) return null;
  return (
    <div className="api-toast" role="alert" aria-live="assertive">
      <div className="api-toast-body">
        <strong className="api-toast-title">{notice.message}</strong>
        {(notice.code || notice.retryAfterSec) && (
          <span className="api-toast-sub">
            {notice.code ? ` ${notice.code}` : ''}
            {notice.retryAfterSec ? ` · retry${retryHint(notice.retryAfterSec)}` : ''}
          </span>
        )}
      </div>
      <button type="button" className="api-toast-dismiss" onClick={() => setNotice(null)} aria-label="Dismiss notification">
        ×
      </button>
    </div>
  );
}
