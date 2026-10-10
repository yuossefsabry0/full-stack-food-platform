'use strict';

// Shared test bootstrap. MUST be the first require in every test file
// (before src/*), because src modules read these variables at load time.
//
// - Forces NODE_ENV=test so src/config/database.js switches to the
//   dedicated TEST_DATABASE_URL automatically.
// - Refuses to run unless the database name contains "test", so a
//   misconfigured environment can never wipe development/production data.
// - Sets test JWT secrets when none are provided.
// - Raises rate limits for ordinary test traffic (the rate-limit suite sets
//   its own low values BEFORE requiring this file, and those are respected).

process.env.NODE_ENV = 'test';

const DEFAULT_TEST_URL = 'mysql://root@127.0.0.1:3307/food_platform_test';

if (!process.env.TEST_DATABASE_URL) {
  process.env.TEST_DATABASE_URL = DEFAULT_TEST_URL;
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

function databaseName(url) {
  const m = String(url).match(/\/([A-Za-z0-9_$-]+)(\?|$)/);
  return m ? m[1] : '';
}

const dbName = databaseName(process.env.DATABASE_URL);
if (!/test/i.test(dbName)) {
  throw new Error(
    `Refusing to run tests against non-test database "${dbName}". ` +
      'Set TEST_DATABASE_URL to a dedicated test database.'
  );
}

if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars-12345678';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars-1234567';
}
// Existing OTP tests rely on devOtp: enable dev exposure for tests only
// (set before src/* is loaded; production default stays disabled).
if (!process.env.OTP_DEV_EXPOSE) {
  process.env.OTP_DEV_EXPOSE = 'true';
}
if (!process.env.LOG_FILE) {
  process.env.LOG_FILE = 'logs/test-operational.log';
}

function setDefault(name, value) {
  if (process.env[name] === undefined || process.env[name] === '') {
    process.env[name] = String(value);
  }
}

// Generous defaults so unrelated suites never trip each other's limits.
setDefault('RATE_LOGIN_MAX', 10000);
setDefault('RATE_REGISTER_MAX', 10000);

module.exports = { dbName };
