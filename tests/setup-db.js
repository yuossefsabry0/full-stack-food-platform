'use strict';

// Test-database setup (run explicitly via `npm run test:setup`):
//   1. Connects to the MySQL server (no database selected).
//   2. Creates the dedicated test database if missing (name must contain
//      "test" — anything else aborts instead of touching real data).
//   3. Pushes the Prisma schema into it (`prisma db push`).
//
// Never creates, migrates, or seeds development/production databases.

require('dotenv').config();
const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');

const TEST_URL =
  process.env.TEST_DATABASE_URL || 'mysql://root@127.0.0.1:3307/food_platform_test';

function parseMysqlUrl(url) {
  const m = String(url).match(/^mysql:\/\/([^:]*)(?::([^@]*))?@([^:/]+)(?::(\d+))?\/([A-Za-z0-9_$-]+)/);
  if (!m) throw new Error(`Cannot parse TEST_DATABASE_URL: ${url}`);
  return {
    user: decodeURIComponent(m[1] || 'root'),
    password: decodeURIComponent(m[2] || ''),
    host: m[3],
    port: parseInt(m[4] || '3306', 10),
    database: m[5],
  };
}

async function main() {
  const cfg = parseMysqlUrl(TEST_URL);
  if (!/test/i.test(cfg.database)) {
    throw new Error(`Refusing to set up non-test database "${cfg.database}".`);
  }
  const server = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
  });
  await server.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await server.end();
  console.log(`Test database ready: ${cfg.database}`);

  const push = spawnSync('npx', ['prisma', 'db', 'push', '--accept-data-loss', '--skip-generate'], {
    cwd: __dirname + '/..',
    env: { ...process.env, DATABASE_URL: TEST_URL, NPM_CONFIG_CACHE: __dirname + '/../.npm-cache' },
    stdio: 'inherit',
    shell: true,
  });
  if (push.status !== 0) throw new Error('prisma db push failed for the test database.');
  console.log('Test schema pushed.');
}

main().catch((e) => {
  console.error('Test setup failed:', e.message);
  process.exitCode = 1;
});
