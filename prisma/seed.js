'use strict';

//  ADMIN creation through source code / database seed ONLY
//
// There is intentionally NO public (or admin) create-admin endpoint: no user
// may create an ADMIN account through the site. Run:
//
//   npm run db:seed
//
// Configuration comes from the environment (see .env.example). Values shown
// below are development defaults — override them in production. The script
// is idempotent: if the username or email already exists, it does nothing.

require('dotenv').config();

const prisma = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { allocatePublicId } = require('../src/services/publicId.service');

const ADMIN_DEFAULTS = {
  name: 'Site Admin',
  username: 'admin',
  email: 'admin@example.com',
  password: 'Admin123!',
};

async function main() {
  const usingDefaults =
    !process.env.ADMIN_USERNAME && !process.env.ADMIN_EMAIL && !process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || ADMIN_DEFAULTS.name;
  const username = process.env.ADMIN_USERNAME || ADMIN_DEFAULTS.username;
  const email = process.env.ADMIN_EMAIL || ADMIN_DEFAULTS.email;
  const password = process.env.ADMIN_PASSWORD || ADMIN_DEFAULTS.password;

  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true },
  });
  if (existing) {
    console.log(`Seed: admin account "${username}" already exists — nothing to do.`);
    return;
  }

  if (usingDefaults) {
    console.warn(
      'Seed WARNING: using default admin credentials (ADMIN_USERNAME/ADMIN_EMAIL/ADMIN_PASSWORD not set). ' +
        'Override them in production.'
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const publicId = await allocatePublicId(tx);
    return tx.user.create({
      data: { publicId, name, username, email, passwordHash, role: 'ADMIN' },
    });
  });

  console.log(`Seed: admin account "${user.username}" created with user code ${user.publicId}.`);
}

// Runnable directly (`node prisma/seed.js`, `prisma db seed`) and importable
// (`const { main } = require('./seed')`) without side effects on import.
if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Seed failed:', e.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { main };
