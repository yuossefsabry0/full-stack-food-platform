'use strict';

require('dotenv').config();

const _rawNodeEnv = process.env.NODE_ENV;
const _isDevLike = _rawNodeEnv === 'development' || _rawNodeEnv === 'test';

function _requireJwtSecret(name, fallback) {
  const value = process.env[name] || (_isDevLike ? fallback : '');
  if (!_isDevLike) {
    if (!value || value.includes('change-me') || value.length < 32) {
      throw new Error(
        `${name} must be set to a unique value of at least 32 characters (no "change-me" default) when NODE_ENV is not "development" or "test".`
      );
    }
  }
  return value;
}

const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  // dedicated test database (used automatically when NODE_ENV=test).
  testDatabaseUrl: process.env.TEST_DATABASE_URL || '',
  jwtAccessSecret: _requireJwtSecret('JWT_ACCESS_SECRET', 'change-me-access-secret-min-32-chars'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  // Refresh Token uses a separate secret and (longer) expiration.
  jwtRefreshSecret: _requireJwtSecret('JWT_REFRESH_SECRET', 'change-me-refresh-secret-min-32-chars'),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  //  OTP / password-reset policy.
  otpExpireMinutes: parseInt(process.env.OTP_EXPIRE_MINUTES || '10', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  otpMaxRequestsPerHour: parseInt(process.env.OTP_MAX_REQUESTS_PER_HOUR || '5', 10),
  resetTokenExpireMinutes: parseInt(process.env.RESET_TOKEN_EXPIRE_MINUTES || '15', 10),
  // OTP dev exposure: devOtp in the response + console logging only when
  // OTP_DEV_EXPOSE is the string "true" AND the env is dev-like.
  otpDevExpose: process.env.OTP_DEV_EXPOSE || 'false',
  //  Delivery Fee (not hard-coded in controllers/business logic).
  deliveryFee: Number.isFinite(Number(process.env.DELIVERY_FEE)) && Number(process.env.DELIVERY_FEE) >= 0
    ? Number(process.env.DELIVERY_FEE)
    : 50,
  // Security layer configuration.
  // No '*' default: dev-like falls back to the frontend dev origin,
  // production-like requires an explicit CORS_ORIGIN allowlist.
  corsOrigin: (() => {
    if (process.env.CORS_ORIGIN) return process.env.CORS_ORIGIN;
    if (_isDevLike) return 'http://localhost:5173';
    throw new Error(
      'CORS_ORIGIN must be set to a comma-separated allowlist of origins when NODE_ENV is not "development" or "test".'
    );
  })(),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '1mb',
  //  Operational logging (file stays inside the project).
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  logFile: process.env.LOG_FILE || 'logs/operational.log',
  // Rate limiting tunables (sensitive endpoints).
  rateLoginMax: parseInt(process.env.RATE_LOGIN_MAX || '20', 10),
  rateLoginWindowMs: parseInt(process.env.RATE_LOGIN_WINDOW_MS || String(15 * 60 * 1000), 10),
  rateRegisterMax: parseInt(process.env.RATE_REGISTER_MAX || '20', 10),
  rateRegisterWindowMs: parseInt(process.env.RATE_REGISTER_WINDOW_MS || String(60 * 60 * 1000), 10),
  // Optional Redis URL for the shared rate-limiter store. When unset, the
  // limiter stays purely in-memory (single-instance only).
  redisUrl: process.env.REDIS_URL || '',
  // Purge interval for expired auth_tokens rows (safe default: 6 hours).
  purgeAuthTokensIntervalMs: (() => {
    const parsed = parseInt(process.env.PURGE_AUTH_TOKENS_INTERVAL_MS || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 6 * 60 * 60 * 1000;
  })(),
};

// Deployment/proxy-aware: 'true' -> trust first proxy, 'false'/unset -> direct,
// number -> trust that many hops. req.ip then reflects the real client IP,
// which is what the rate limiter keys on.
function parseTrustProxy(value) {
  if (value === undefined || value === 'false' || value === '') return false;
  if (value === 'true') return true;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : false;
}

module.exports = env;
