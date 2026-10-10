# Food Platform API

Backend API plus React frontend for a food ordering platform. The backend exposes every UI concept (menus, carts, dashboards, buttons) as an API route returning JSON with navigation hints, and the React app in `frontend/` consumes those contracts.

## Project Overview

Customers register and log in, browse a menu, manage a personal cart, confirm orders with a delivery address, and track order status. Orders flow through a fixed lifecycle across roles: the restaurant kitchen (CHEF) prepares them, couriers (DELIVERY) accept and deliver them, and administrators (ADMIN) manage users, products, orders, and staff plus view sales analytics. Authentication uses short-lived JWT access tokens with rotating refresh tokens, OTP-based password recovery, strict Zod validation, server-side role enforcement, rate limiting, security headers, and operational file logging.

## Architecture

Modular Express layout with business logic in services (never in controllers):

- `src/server.js` — process entrypoint (listen + graceful shutdown).
- `src/app.js` — middleware pipeline (trust proxy, helmet, CORS, body limit, request logger) + route mounting + 404/error handlers.
- `src/config/` — environment (`env.js`), Prisma singleton (`database.js`, auto-selects the test DB under `NODE_ENV=test`).
- `src/routes/` — one router per domain (`auth`, `home`, `product`, `cart`, `order`, `chef`, `delivery`, `admin`), mounted in `routes/index.js` (also serves Swagger UI + OpenAPI JSON).
- `src/controllers/` — thin HTTP adapters (status codes, envelopes, navigation).
- `src/services/` — all business logic (`auth`, `token`, `passwordReset`, `mailer`, `product`, `cart`, `order`, `chef`, `delivery`, `admin`, `analytics`, `publicId`).
- `src/middlewares/` — `requireAuth` (JWT), `requireRole` (RBAC), `validate` (body/query/params), `rateLimit` (fixed window, proxy-aware), `requestLogger`, error handler.
- `src/validations/` — Zod schemas for every input surface.
- `src/utils/` — unified response envelope, navigation links, order-status labels, password hashing, Winston logger.
- `prisma/` — `schema.prisma` (MySQL) + `seed.js` (dual seed: ADMIN account plus 20 `MENU-*` products).
- `frontend/` — React 18 + React Router app (isolated; talks to the API over HTTP only).
- `tests/` — `unit/` (pure logic, no DB) and `integration/` (Supertest against a dedicated test DB), sharing `setup.js` + `helpers.js`.
- `docs/openapi.json` — Swagger/OpenAPI 3.0 for all endpoints.
- `postman/` — ready-to-run Postman collection organized by module.

## Tech Stack

Node.js (>=18), Express.js, JavaScript (CommonJS), Prisma ORM, Zod validation, MySQL 8. Docs/tests tooling: `swagger-ui-express`, `supertest`, `mysql2` (test setup only). Security/logging: `helmet`, `winston`, `cors`, `bcryptjs`, `jsonwebtoken`.

## Project Structure

```text
food-platform-api/
  prisma/
    schema.prisma      # MySQL models, enums, indexes
    seed.js            # dual seed: ADMIN + 20 MENU-* products (idempotent by username/email + sku)
  src/
    server.js app.js
    config/ (env, database)
    routes/ (index, auth, home, product, cart, order, chef, delivery, admin)
    controllers/ (auth, passwordReset, product, cart, order, chef, delivery, admin, analytics, home)
    services/ (auth, token, passwordReset, mailer, publicId, product, cart, order, chef, delivery, admin, analytics)
    middlewares/ (auth, role, validate, rateLimit, requestLogger, error)
    validations/ (auth, product, cart, order, admin)
    utils/ (response, navigation, orderStatus, password, logger)
  docs/openapi.json
  postman/food-platform-api.postman_collection.json
  tests/
    setup.js setup-db.js helpers.js
    unit/ integration/
  logs/                # runtime operational logs (gitignored)
```

## Installation

```bash
npm install
```

Requires Node.js >= 18 and a reachable MySQL 8 server.

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Purpose | Default |
|---|---|---|
| `PORT` / `NODE_ENV` | server port / environment | `3000` / `development` |
| `DATABASE_URL` | MySQL connection (dev/prod) | — |
| `TEST_DATABASE_URL` | dedicated test database (name must contain `test`) | `mysql://root@127.0.0.1:3307/food_platform_test` |
| `JWT_ACCESS_SECRET` / `JWT_ACCESS_EXPIRES_IN` | access-token secret/expiry | `15m` |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | separate refresh secret/expiry | `7d` |
| `OTP_EXPIRE_MINUTES` / `OTP_MAX_ATTEMPTS` / `OTP_MAX_REQUESTS_PER_HOUR` / `RESET_TOKEN_EXPIRE_MINUTES` | password-recovery policy | `10` / `5` / `5` / `15` |
| `OTP_DEV_EXPOSE` | return `devOtp` + log OTPs (only when `"true"` AND dev-like env) | `"false"` |
| `DELIVERY_FEE` | delivery fee (never hard-coded) | `50` |
| `ADMIN_NAME` / `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed admin (dev defaults; override in prod) | — |
| `CORS_ORIGIN` | comma-separated allowed origins | dev/test default `http://localhost:5173`; required in production-like envs (startup throws when missing) |
| `TRUST_PROXY` | `false` \| `true` \| hop count (real client IP) | `false` |
| `REQUEST_BODY_LIMIT` | max JSON body (oversize → 413) | `1mb` |
| `LOG_LEVEL` / `LOG_FILE` | operational log verbosity/path | `debug` / `logs/operational.log` |
| `RATE_LOGIN_MAX` / `RATE_LOGIN_WINDOW_MS` / `RATE_REGISTER_MAX` / `RATE_REGISTER_WINDOW_MS` | sensitive-endpoint budgets | `20`/15min, `20`/hour |
| `REDIS_URL` | optional shared rate-limiter store (unset = in-memory) | — |
| `PURGE_AUTH_TOKENS_INTERVAL_MS` | expired-auth-token purge interval | 6 hours |

## Database Configuration

MySQL 8 via Prisma (`provider = "mysql"`, `DATABASE_URL`). Internal auto-increment `User.id` is the only foreign-key target; the public `User.publicId` code (sequential from `10000`, allocated via a singleton counter row) is display-only, so expanding 5→6+ digits never touches relations or history. Deactivation uses `isActive` flags — rows linked to history are never deleted. Order items keep their own `productName`/`unitPrice` snapshots with a `SetNull` product link; orders keep `chefId`/`deliveryId` with `SetNull` user links.

## Prisma Migrations

```bash
npm run prisma:validate   # validate schema
npm run prisma:generate   # regenerate client
npm run prisma:push       # sync schema to DATABASE_URL (dev)
npm run prisma:migrate    # migrate dev database
```

## Seed

```bash
npm run db:seed
```

Dual seed (idempotent, additive only — existing rows are never overwritten or deleted): creates the ADMIN account from `ADMIN_*` env (skips when the username/email exists; there is intentionally **no** create-admin endpoint) plus the 20 `MENU-*` catalog products (matched by `sku`). Override the `ADMIN_*` defaults in production.

## Frontend

React 18 single-page app in `frontend/` (React Router; no backend imports — HTTP contracts only, see `frontend/src/api/client.js`).

```bash
cd frontend
npm install
npm run dev      # Vite dev server on http://localhost:5173 (proxies /api to the backend)
npm run build    # production build
```

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | backend API base URL | `http://localhost:3000/api` |

The dev server port (5173) is the backend's dev-like `CORS_ORIGIN` default, so the stock setup works without extra CORS configuration.

## Authentication

- Register (`POST /api/auth/register`): name/username/email/password, always `BASIC` (strict schema rejects `role`), 201 navigates to login without auto-login.
- Login (`POST /api/auth/login`, shared by all roles): returns identity + access/refresh tokens; ADMIN logins navigate to the dashboard, others home.
- Refresh (`POST /api/auth/refresh`): separate secret/expiry; rotation revokes the presented token (reuse → 401); hashed server-side records.
- Forgot password (`POST /api/auth/forgot-password`): email-only, always the same generic message (anti-enumeration), 6-digit OTP via the mailer hook (dev logs the code; production plugs an SMTP/API provider into `mailer.service.js`).
- Verify OTP (`POST /api/auth/verify-otp`): wrong → 400 with no forward navigation; correct → single-use `resetToken` + move to new password. 10-minute expiry, one-time use, 5-attempt lockout, per-hour request cap, OTPs stored as bcrypt hashes only.
- New password (`POST /api/auth/reset-password`): password + confirmation must match; bcrypt-hashed, reset token consumed, refresh sessions revoked, move to login.
- Expired access tokens are rejected on all protected routes (`401`).

## Authorization

`requireAuth` (valid JWT + active account) runs first, then `requireRole(...)` enforces one role per area — entirely server-side, never trusting the frontend. Public routes are limited to register, login, refresh, forgot-password, verify-OTP, reset-password, health (and docs), plus public browse-only reads `GET /api/home` (guest supported via optional auth) and `GET /api/products*` (menu/details).

## Roles & Permissions

| Role | Allowed areas |
|---|---|
| BASIC | menu/products (public), own cart, checkout, own orders, home |
| CHEF | `/api/chef/*`: request orders, prepare, own history |
| DELIVERY | `/api/delivery/*`: current orders, accept, deliver, own history |
| ADMIN | `/api/admin/*`: dashboard, users, products, orders, staff, analytics |

Cross-role access returns `403 FORBIDDEN`; e.g. chefs cannot touch carts and couriers cannot read other couriers' queues beyond shared `READY_FOR_DELIVERY` listings.

## Products

`GET /api/products` (menu: id, name, price, image, description, details link; active only) with `page`/`limit` (limit ≤ 50) and optional case-insensitive partial `search` (2–3 letters match). `GET /api/products/:id` shows name/price/image/description plus the add-to-cart operation. Admin manages products (add/edit/price/name/description/image/activate/deactivate) with soft-deactivation only.

Search implementation note: `search` is a `LIKE '%term%'` scan, so a B-tree index would not help the leading-wildcard match (no index, migration, or code change added for this). Case-insensitivity depends on the MySQL collation (`utf8mb4_unicode_ci` in the test setup). This is fine for a small catalog; when the catalog grows, the future option is a `FULLTEXT` index on `name`/`description` plus a `MATCH ... AGAINST` query change.

## Cart

Authenticated BASIC cart derived from the JWT identity (no cart ids from clients, so no cross-user access). Add by product ID (repeats increase quantity, one row per product), set/increase/decrease quantity (decrease at 1 removes), delete items, totals (`productsTotal` + configured `deliveryFee` = `totalAmount`). `POST /api/cart/confirm` previews totals and moves to the delivery-address route; empty carts cannot confirm.

## Orders

Checkout posts the full delivery address (all six fields required by Zod) and atomically creates the order + snapshot items + clears the cart in one transaction (cart clears only on full success). One active (non-`DELIVERED`) order per BASIC user. Orders are immutable after confirmation and visible only to their owner (plus role queues/admin). Reads are paginated.

## Order Lifecycle

```
PENDING → PREPARING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED
```

The database stores only these English enum values. API responses add display labels: PENDING = “In Progress”, PREPARING = “Your order has been prepared by the restaurant”, READY_FOR_DELIVERY = “Ready for Delivery”, OUT_FOR_DELIVERY = “The order has gone out for delivery by the Delivery”, DELIVERED = “The order has been delivered”.

## CHEF Workflow

`GET /api/chef/requests` lists `PENDING` orders with preparation data (items, quantities, totals, address). `POST /api/chef/requests/:id/prepare` is the only chef status change: an atomic `PENDING → READY_FOR_DELIVERY` recording `chefId` + `preparedAt`. Prepared orders leave requests, appear read-only in `GET /api/chef/history` (chefId retained for admin), and become visible to delivery.

## DELIVERY Workflow

`GET /api/delivery/orders/current` shows `READY_FOR_DELIVERY` orders (full delivery data + `Accept` operation) plus the courier's own `OUT_FOR_DELIVERY` order (with the `Delivered` operation, which never appears before acceptance). Accept claims via one conditional atomic update (one concurrent winner; losers fail `409`), links `deliveryId`, sets `OUT_FOR_DELIVERY`; one active delivery per courier (`409 DELIVERY_BUSY` otherwise). Deliver sets `DELIVERED`, moves the order to read-only `GET /api/delivery/orders/previous` (limited data, `deliveryId` retained).

## ADMIN Workflow

`GET /api/admin` dashboard (links). Users: paginated list returning only name/username/userCode/email. Products: view (incl. inactive), add, edit, activate/deactivate — never hard-delete. Orders: all current orders with status/date/user/delivery/chef/order filters plus pagination and sorting; `OUT_FOR_DELIVERY` rows carry `deliveryId`; chef/delivery histories via `chefId`/`deliveryId`. Staff: create CHEF/DELIVERY (role enum blocks ADMIN; hashed password; public code; immediately login-capable), view, edit, activate/deactivate via `isActive` (never delete; ADMIN accounts untouchable here).

## Analytics

`GET /api/admin/analytics`: units sold today/month/year, total sales today/month/year, and units for every product — computed exclusively from `DELIVERED` order items (carts and undelivered orders never count), using snapshot names so history is stable. UTC period boundaries.

## Security

Bcrypt password hashing; JWT access + separate refresh secrets/expiry with rotation and hashed server-side records; server-side RBAC; Zod on every input surface; Helmet headers; configurable CORS; 1 MB body limit (413 on overflow); rate limiting on sensitive endpoints; operational logs that never contain passwords, tokens, OTPs, or request bodies.

## Rate Limiting

Fixed-window in-memory limiter keyed by client IP (proxy-aware via `TRUST_PROXY`) and, where relevant, email or user id. Budgeted: login, register, refresh, forgot-password, OTP verify/reset, checkout (per user). Emits `429 RATE_LIMITED` with `Retry-After`. Budgets are env-tunable (see table above). The in-memory limiter is single-instance only: counters live in the Node process, so horizontal scaling needs sticky sessions or the optional Redis store. Set `REDIS_URL` to share counters across instances (same limits and responses); the Redis client is reused across requests, and any Redis runtime failure falls back to the in-memory store without blocking requests.

## Testing

```bash
npm run test:unit         # unit suite only — needs no database
npm run test:setup        # prepare the test database only (create + push schema)
npm run test:integration  # integration suite against the prepared test DB (no auto-setup)
npm test                  # unit + integration suites (prepare the DB first, see below)
```

Full integration workflow (the `pretest` auto-setup coupling was removed, so
setup is explicit):

```bash
docker compose -f docker-compose.test.yml up -d   # MySQL on 127.0.0.1:3307
npm run test:setup                                 # create food_platform_test + push schema
npm run test:integration                           # run the integration suite
```

Unit tests (`tests/unit/`) cover pure logic with no database: status labels, navigation, password hashing, token issue/verify/separation, all Zod schemas, response envelopes, rate-limiter behavior, log redaction, analytics period bounds, Postman collection shape. Integration tests (`tests/integration/`, Supertest) cover every module end to end — auth/refresh, password recovery, products/search/pagination, cart flows and isolation, checkout/transactions/rules, chef, delivery (incl. race-safe claims), admin CRUD/filters/staff/analytics, rate-limit trips, and a bidirectional Swagger-vs-router coverage check.

## Test Database

`TEST_DATABASE_URL` (default `food_platform_test`) is selected automatically whenever `NODE_ENV=test` — both by `src/config/database.js` and `tests/setup.js`, which additionally refuses to run unless the database name contains `test`. `tests/setup-db.js` creates the database and pushes the schema without touching dev/prod. Fixtures use unique names per file/process, so suites never depend on dev/prod data (or on each other) and reruns are safe.

## Swagger

Interactive UI at `GET /api/docs`, machine-readable OpenAPI 3.0 at `GET /api/docs.json` (`docs/openapi.json`): methods, URLs, headers, auth/authorization, parameters, bodies, validation, success/error responses, and schemas for all 35 routes. A test asserts every Express route is documented and no documented path is stale.

## Postman

`postman/food-platform-api.postman_collection.json` (v2.1): folders Authentication, Users, Products, Cart, Orders, CHEF, DELIVERY, ADMIN, Analytics with methods, `{{baseUrl}}`-based URLs, bearer auth, parameters, and bodies; the Login request auto-stores `accessToken`/`refreshToken` variables. A unit test enforces folder/request completeness.

## Logging

Winston JSON-lines file (`LOG_FILE`, default `logs/operational.log`, `LOG_LEVEL` tunable): timestamp, level, method, full route, status code, duration, and error code/message. Request bodies, query strings, headers, passwords, tokens, and OTPs are never recorded (sensitive keys are redacted by `sanitize`). This file is purely operational and separate from any future admin activity-history feature.

## API Usage

```bash
# register + login
curl -X POST localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ted","username":"ted","email":"ted@example.com","password":"Secret123!"}'
curl -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"ted","password":"Secret123!"}'

# browse + buy (TOKEN from login)
curl 'localhost:3000/api/products?search=burg&page=1&limit=10'
curl -X POST localhost:3000/api/cart/items \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"productId":1,"quantity":2}'
curl -X POST localhost:3000/api/cart/confirm -H "Authorization: Bearer $TOKEN"
curl -X POST localhost:3000/api/orders/checkout \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Ted","address":"Flat 5","buildingNumber":"12","apartmentNumber":"5","streetName":"Main St","phoneNumber":"+1000000"}'
```

Every response uses the envelope `{ success, message, data, navigation, meta }` (errors: `{ success:false, message, code, errors }`), where `navigation.links`/`navigation.next` describe the available next actions for a future frontend.

## Future Extensibility

Role areas, services, validations, and navigation are isolated per domain, so new roles or flows (e.g. PREPARING sub-steps, promotions, admin activity history) slot in as new routers/services without touching existing ones. Enums, snapshots, soft-deactivation, and transactions keep history immutable; response envelopes are backward compatible (new keys only); OpenAPI + Postman + tests pin every contract so regressions surface immediately.
