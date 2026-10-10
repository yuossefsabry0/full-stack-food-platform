'use strict';

const env = require('./config/env');
const app = require('./app');
const { runPurgeExpiredAuthTokens } = require('./jobs/purgeExpiredAuthTokens.job');

// Periodically purge old auth_tokens rows (expiresAt older than the
// 7-day grace period). unref() so the timer never keeps the process alive.
const purgeTimer = setInterval(runPurgeExpiredAuthTokens, env.purgeAuthTokensIntervalMs);
if (purgeTimer.unref) purgeTimer.unref();

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`food-platform-api listening on port ${env.port} (${env.nodeEnv})`);
});

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
