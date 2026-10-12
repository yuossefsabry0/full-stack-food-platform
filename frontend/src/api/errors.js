// Shared API-error formatting (presentational only).
// Reads the existing backend envelope { success:false, message, code, errors }
// attached by apiFetch as err.payload / err.status — no contract changes.

export function formatApiError(err) {
  if (!err) return { message: 'Something went wrong.', code: '', retryAfterSec: null, details: [] };
  const payload = err.payload || {};
  const message = payload.message || payload.error || err.message || 'Something went wrong.';
  const code = payload.code || err.code || '';
  const details = Array.isArray(payload.errors)
    ? payload.errors.map((e) => (typeof e === 'string' ? e : e?.message || [e?.field, e?.message].filter(Boolean).join(': ') || 'Invalid input'))
    : [];
  const retryAfterSec = err.retryAfterSec ?? err.retryAfter ?? null;
  return { message, code, retryAfterSec, details, status: err.status ?? null };
}

export function retryHint(retryAfterSec) {
  const n = Number(retryAfterSec);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 60) return ` Retry in ~${n}s.`;
  return ` Retry in ~${Math.ceil(n / 60)} min.`;
}
