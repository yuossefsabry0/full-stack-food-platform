'use strict';

const env = require('./config/env');
const app = require('./app');
const prisma = require('./config/database');
const { runPurgeExpiredAuthTokens } = require('./jobs/purgeExpiredAuthTokens.job');
const { runRetryOrderEvents } = require('./jobs/retryOrderEvents.job');

// Periodically purge old auth_tokens rows (expiresAt older than the
// 7-day grace period). unref() so the timer never keeps the process alive.
const purgeTimer = setInterval(runPurgeExpiredAuthTokens, env.purgeAuthTokensIntervalMs);
if (purgeTimer.unref) purgeTimer.unref();

// Retry undelivered order-event outbox rows (no-loss webhooks). Same
// lifecycle as the purge timer: unref'd, cleared on shutdown. Tests import
// the retry function directly and never start this interval.
const outboxTimer = setInterval(runRetryOrderEvents, env.orderEventRetryIntervalMs);
if (outboxTimer.unref) outboxTimer.unref();

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`food-platform-api listening on port ${env.port} (${env.nodeEnv})`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, shutting down...`);
  try {
    if (purgeTimer && typeof purgeTimer.unref === 'function') clearInterval(purgeTimer);
  } catch { /* timer cleanup is best-effort */ }
  try {
    if (outboxTimer && typeof outboxTimer.unref === 'function') clearInterval(outboxTimer);
  } catch { /* timer cleanup is best-effort */ }
  const forceExit = setTimeout(() => process.exit(0), 5000);
  if (forceExit.unref) forceExit.unref();
  server.close(async () => {
    // Best-effort drains: Prisma disconnect + Redis quit must never hang
    // shutdown or change request handling.
    try {
      if (prisma && typeof prisma.$disconnect === 'function') await prisma.$disconnect();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Prisma disconnect during shutdown failed:', err && err.message);
    }
    try {
      const { _resetRedisForTests } = require('./middlewares/rateLimit.middleware');
      if (typeof _resetRedisForTests === 'function') _resetRedisForTests();
    } catch { /* redis cleanup is best-effort */ }
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Fail-fast observability without changing API contracts: unexpected
// async errors are logged, then the process shuts down gracefully instead
// of continuing in an unknown state.
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled rejection:', reason && reason.message ? reason.message : reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught exception:', err && err.message ? err.message : err);
  shutdown('uncaughtException');
});

module.exports = server;
