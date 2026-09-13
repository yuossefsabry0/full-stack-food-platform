'use strict';

const prisma = require('../config/database');

// Public User ID / User Code allocator.
//
// - Starts at 10000 (first-ever user gets "10000").
// - Sequential: 10000, 10001, ... 99999, 100000, 100001, ...
// - Stored as String on User.publicId so growing from 5 to 6+ digits never
//   touches relations or historical rows (relations use User.id only).
// - Allocation is atomic via a singleton counter row inside a transaction.

const FIRST_PUBLIC_ID = 10000;

async function allocatePublicId(tx) {
  const client = tx || prisma;

  let counter = await client.userPublicIdCounter.findUnique({ where: { id: 1 } });
  if (!counter) {
    counter = await client.userPublicIdCounter.create({
      data: { id: 1, lastValue: FIRST_PUBLIC_ID - 1 },
    });
  }

  const updated = await client.userPublicIdCounter.update({
    where: { id: 1 },
    data: { lastValue: { increment: 1 } },
  });

  return String(updated.lastValue);
}

module.exports = { allocatePublicId, FIRST_PUBLIC_ID };
