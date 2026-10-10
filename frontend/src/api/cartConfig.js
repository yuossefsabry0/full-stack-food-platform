// Shared cart quantity cap: fetched once from the backend home response
// (data.maxQuantity), falling back to 99 when unavailable. Uses the existing
// client mechanism without duplicating the API prefix; the fetch skips the
// login redirect so a stale token never navigates away just for the cap.
import { apiFetch } from './client.js';

export const MAX_QUANTITY_FALLBACK = 99;

let cached = null;

export async function getMaxQuantity() {
  if (cached !== null) return cached;
  try {
    const res = await apiFetch('/home', { auth: true, skipAuthRedirect: true });
    const value = Number(res?.data?.maxQuantity);
    cached = Number.isFinite(value) && value > 0 ? value : MAX_QUANTITY_FALLBACK;
  } catch {
    cached = MAX_QUANTITY_FALLBACK;
  }
  return cached;
}
