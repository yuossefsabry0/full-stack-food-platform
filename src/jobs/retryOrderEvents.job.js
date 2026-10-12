'use strict';

const { processOrderEventOutbox } = require('../services/order.service');

// Periodic retry of undelivered order-event outbox rows (best-effort).
// Started via setInterval from the server entry point only.
async function runRetryOrderEvents() {
  try {
    const result = await processOrderEventOutbox(20);
    if (result && (result.processed > 0 || result.delivered > 0)) {
      // eslint-disable-next-line no-console
      console.log(`Order event outbox: processed ${result.processed}, delivered ${result.delivered}.`);
    }
    return result;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to retry order event outbox:', e.message);
    return { processed: 0, delivered: 0 };
  }
}

module.exports = { runRetryOrderEvents };
