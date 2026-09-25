# Joo Food — Isolated React Frontend

Presentational Task implementation: BASIC navbar, Home showcase, Admin dashboard entry.
Consumes the existing backend API (`http://localhost:3000/api` by default) with zero
backend changes. See `src/api/client.js` for the exact endpoint map.

## Run

```bash
cp .env.example .env   # optional; VITE_API_BASE_URL defaults to http://localhost:3000/api
npm install
npm run dev            # http://localhost:5173
npm run build          # production build into dist/
```

Backend must be running separately (`npm run dev` in the repo root, port 3000).

## Routes

- Public: `/login /register /forgot-password /verify-otp /reset-password`
- BASIC (dark-blue navbar): `/home /menu /products/:id /cart /delivery-address /orders /orders/:id`
- CHEF (own dark header, no BASIC navbar): `/chef/requests /chef/history`
- DELIVERY (own dark header, no BASIC navbar): `/delivery/current /delivery/previous`
- ADMIN (dashboard grid, no BASIC navbar): `/admin /admin/users /admin/products /admin/orders /admin/staff /admin/analytics`

## Notes

- Logout (navbar + admin dashboard) clears `fp_accessToken / fp_refreshToken / fp_user` and redirects to `/login`.
- Home images are placeholders in `src/assets/foodImages.js` — swap `src` values for final assets, no code changes needed.
- Animations: plain CSS + `IntersectionObserver` (`src/components/Reveal.jsx`), no new animation library.
- Global background: off-white gray `#eef0f3` in `src/styles/global.css`; cards/navbar keep their own backgrounds.
