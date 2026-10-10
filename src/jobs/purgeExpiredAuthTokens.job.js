'use strict';

const { purgeExpiredAuthTokens } = require('../services/auth.service');

// Periodic purge of old auth_tokens rows (only rows whose expiresAt is
// older than the 7-day grace period). Started via setInterval from the
// server entry point only.
async function runPurgeExpiredAuthTokens() {
  try {
    const result = await purgeExpiredAuthTokens();
    // eslint-disable-next-line no-console
    console.log(`Purged ${result.deleted} expired auth token(s).`);
    return result;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to purge expired auth tokens:', e.message);
    return { deleted: 0 };
  }
}

module.exports = { runPurgeExpiredAuthTokens };
