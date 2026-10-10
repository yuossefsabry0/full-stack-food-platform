# Token Storage Security Notes

Documentation only — no code changes.

## Current approach: tokens in localStorage

After login (`POST /api/auth/login`) the frontend keeps three values in
`localStorage` (`fp_accessToken`, `fp_refreshToken`, `fp_user`) and sends
`Authorization: Bearer <accessToken>` on protected calls. The backend hashes
both tokens into `auth_tokens`, rotates the refresh token on every refresh
(reuse → `401`), and revokes rows on `POST /api/auth/logout` (single session
or all sessions); `requireAuth` additionally rejects access tokens whose
server-side row is missing or revoked.

## The XSS risk

Any JavaScript running on the page origin (a stored/reflected XSS payload, a
compromised third-party script, a malicious browser extension with page
access) can read `localStorage` and exfiltrate both tokens. An `httpOnly`
cookie is invisible to page JavaScript, so it removes this entire theft path
for the token it holds. Short access-tokenExpiry (`JWT_ACCESS_EXPIRES_IN`)
limits the blast radius but does not prevent theft of the long-lived refresh
token, which is the higher-value secret.

## Recommended strict Content-Security-Policy

Serve the frontend HTML with a policy close to this (tighten `connect-src`
to the real API origin; add image hosts only if the menu needs them):

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:3000; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

Notes:

- No `unsafe-inline`/`unsafe-eval` in `script-src` (React production builds
  comply); `'unsafe-inline'` in `style-src` only because the UI uses inline
  styles.
- `frame-ancestors 'none'` blocks clickjacking; `form-action 'self'`
  constrains exfiltration via form posts.
- CSP is a second layer, not a fix: it raises the bar for XSS but the
  refresh token should still move to an `httpOnly` cookie below.

## Migration plan: refresh token to httpOnly, Secure, SameSite cookie

Goal: the refresh token lives only in a cookie the browser attaches
automatically; page JavaScript never sees it. The access token stays in
memory/`localStorage` (short-lived) until a later step moves it too.

1. **Backend — set the cookie on login/refresh.** In the login and refresh
   responses, add
   `Set-Cookie: fp_refresh=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=<refresh lifetime>`.
   Keep returning the token in the JSON body during the transition.
2. **Backend — accept the cookie on refresh/logout.** `POST /api/auth/refresh`
   and `POST /api/auth/logout` read the refresh token from the cookie when
   the body field is absent (requires a cookie parser; no new token logic —
   the existing hashed-record rotation/revocation checks run unchanged).
3. **Backend — clear the cookie on logout.** `POST /api/auth/logout`
   responds with an expired `fp_refresh` cookie alongside the existing row
   revocation (single or all sessions).
4. **CORS + client.** Enable `credentials: 'include'` on the auth fetch
   calls and set the server CORS `origin` to the explicit frontend origin
   (never `*`) with `credentials: true`, so the browser sends the cookie.
5. **Frontend — stop storing the refresh token.** Remove `fp_refreshToken`
   from `localStorage`; send `{}` (cookie supplies it) on refresh/logout.
6. **Harden the cookie.** `Secure` (HTTPS-only; needs TLS in front of the
   API), `SameSite=Strict` (or `Lax` if top-level navigation flows need it),
   minimal `Path`, and a `__Host-` prefix when served over HTTPS.
7. **Verify.** XSS probe: exfiltrating `localStorage`/`document.cookie`
   yields no refresh token; logout revokes server-side and clears the
   cookie; refresh rotation still rejects reuse with `401`.
