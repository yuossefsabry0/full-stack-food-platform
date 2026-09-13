'use strict';

require('dotenv').config();

const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  // dedicated test database (used automatically when NODE_ENV=test).
  testDatabaseUrl: process.env.TEST_DATABASE_URL || '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-access-secret-min-32-chars',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  // Refresh Token uses a separate secret and (longer) expiration.
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret-min-32-chars',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  //  OTP / password-reset policy.
  otpExpireMinutes: parseInt(process.env.OTP_EXPIRE_MINUTES || '10', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  otpMaxRequestsPerHour: parseInt(process.env.OTP_MAX_REQUESTS_PER_HOUR || '5', 10),
  resetTokenExpireMinutes: parseInt(process.env.RESET_TOKEN_EXPIRE_MINUTES || '15', 10),
  //  Delivery Fee (not hard-coded in controllers/business logic).
  deliveryFee: Number.isFinite(Number(process.env.DELIVERY_FEE)) && Number(process.env.DELIVERY_FEE) >= 0
    ? Number(process.env.DELIVERY_FEE)
    : 50,
  // Security layer configuration.
  corsOrigin: process.env.CORS_ORIGIN || '*',
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
