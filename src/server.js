'use strict';

const env = require('./config/env');
const app = require('./app');

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
