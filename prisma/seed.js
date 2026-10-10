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

// Menu seed: 20 dishes, each with price + image + details (description).
// Displayed by GET /api/products (Menu) and GET /api/products/:id
// (Product Details). Additive only: idempotent by sku, active by default,
// never updates or deletes existing rows.
const MENU_ITEMS = [
  {
    sku: 'MENU-001',
    name: 'Wood-fired Margherita Pizza',
    price: 12.99,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80&auto=format&fit=crop',
    description: 'Wood-fired pizza with tomato sauce, fresh mozzarella, basil, and extra-virgin olive oil on a thin crispy crust.',
  },
  {
    sku: 'MENU-002',
    name: 'Classic Beef Burger',
    price: 9.49,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80&auto=format&fit=crop',
    description: 'Grilled beef patty with cheddar, lettuce, tomato, pickles, and house sauce in a toasted brioche bun.',
  },
  {
    sku: 'MENU-003',
    name: 'Garden Fresh Salad Bowl',
    price: 7.99,
    imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80&auto=format&fit=crop',
    description: 'Crisp mixed greens, cherry tomatoes, cucumber, avocado, and feta with lemon-olive oil dressing.',
  },
  {
    sku: 'MENU-004',
    name: 'Grilled Chicken Skewers',
    price: 11.49,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80&auto=format&fit=crop',
    description: 'Char-grilled marinated chicken skewers served with grilled vegetables and garlic yogurt dip.',
  },
  {
    sku: 'MENU-005',
    name: 'Berry Cheesecake Dessert',
    price: 6.49,
    imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80&auto=format&fit=crop',
    description: 'Creamy baked cheesecake topped with fresh strawberries, blueberries, and berry coulis.',
  },
  {
    sku: 'MENU-006',
    name: 'Power Protein Bowl',
    price: 8.99,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80&auto=format&fit=crop',
    description: 'Quinoa, grilled chicken, boiled egg, avocado, and greens with a light tahini dressing. High in protein.',
  },
  {
    sku: 'MENU-007',
    name: 'Creamy Alfredo Pasta',
    price: 10.99,
    imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80&auto=format&fit=crop',
    description: 'Fettuccine tossed in creamy parmesan Alfredo sauce with mushrooms and grilled chicken strips.',
  },
  {
    sku: 'MENU-008',
    name: 'Sushi Platter',
    price: 16.99,
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80&auto=format&fit=crop',
    description: 'Assorted fresh nigiri and maki rolls with salmon, tuna, avocado, served with soy sauce, wasabi, and ginger.',
  },
  {
    sku: 'MENU-009',
    name: 'Street-Style Tacos',
    price: 8.49,
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=80&auto=format&fit=crop',
    description: 'Three soft corn tortillas with seasoned beef, onions, cilantro, lime, and spicy salsa.',
  },
  {
    sku: 'MENU-010',
    name: 'Tonkotsu Ramen',
    price: 12.49,
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80&auto=format&fit=crop',
    description: 'Rich pork broth ramen with noodles, chashu pork, soft egg, bamboo shoots, and green onions.',
  },
  {
    sku: 'MENU-011',
    name: 'Grilled Ribeye Steak',
    price: 19.99,
    imageUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80&auto=format&fit=crop',
    description: 'Juicy grilled ribeye steak seasoned with herbs, served with roasted potatoes and steamed vegetables.',
  },
  {
    sku: 'MENU-012',
    name: 'Crispy Fried Chicken',
    price: 9.99,
    imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800&q=80&auto=format&fit=crop',
    description: 'Golden crispy fried chicken pieces with coleslaw, fries, and a choice of dipping sauce.',
  },
  {
    sku: 'MENU-013',
    name: 'Falafel Wrap',
    price: 7.49,
    imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80&auto=format&fit=crop',
    description: 'Crispy falafel, hummus, pickles, tomatoes, and tahini sauce wrapped in soft flatbread. Vegetarian.',
  },
  {
    sku: 'MENU-014',
    name: 'Double Cheese Burger with Fries',
    price: 11.99,
    imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80&auto=format&fit=crop',
    description: 'Double beef patties with melted cheddar, caramelized onions, and fries on the side.',
  },
  {
    sku: 'MENU-015',
    name: 'Vegetable Noodle Stir-Fry',
    price: 9.29,
    imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80&auto=format&fit=crop',
    description: 'Wok-tossed noodles with bell peppers, carrots, broccoli, and soy-ginger sauce. Vegan friendly.',
  },
  {
    sku: 'MENU-016',
    name: 'Butter Chicken Curry',
    price: 13.49,
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80&auto=format&fit=crop',
    description: 'Tender chicken in creamy tomato-butter curry sauce, served with basmati rice and naan bread.',
  },
  {
    sku: 'MENU-017',
    name: 'Fluffy Pancakes with Honey',
    price: 6.99,
    imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80&auto=format&fit=crop',
    description: 'Stack of fluffy pancakes served with honey, butter, and fresh berries. Perfect for breakfast.',
  },
  {
    sku: 'MENU-018',
    name: 'Avocado Toast Breakfast',
    price: 7.29,
    imageUrl: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&q=80&auto=format&fit=crop',
    description: 'Sourdough toast with smashed avocado, poached egg, cherry tomatoes, and chili flakes.',
  },
  {
    sku: 'MENU-019',
    name: 'Pepperoni Pizza Slice Combo',
    price: 10.49,
    imageUrl: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800&q=80&auto=format&fit=crop',
    description: 'Two large pepperoni pizza slices with mozzarella and oregano, served with a soft drink.',
  },
  {
    sku: 'MENU-020',
    name: 'Chocolate Lava Cake',
    price: 5.99,
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&auto=format&fit=crop',
    description: 'Warm chocolate cake with a molten center, served with vanilla ice cream and cocoa dust.',
  },
];

async function seedMenuItems() {
  let created = 0;
  for (const item of MENU_ITEMS) {
    const existing = await prisma.product.findUnique({ where: { sku: item.sku }, select: { id: true } });
    if (existing) {
      continue;
    }
    await prisma.product.create({
      data: {
        sku: item.sku,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        isActive: true,
      },
    });
    created += 1;
  }
  console.log(`Seed: menu items — ${created} created, ${MENU_ITEMS.length - created} already existed.`);
}

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
  } else {
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

  await seedMenuItems();
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
