'use strict';

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert/strict');

const { request, app, prisma, uid } = require('../helpers');

after(() => prisma.$disconnect());

const NS = `tprod${Date.now().toString(36)}`;

before(async () => {
  await prisma.product.createMany({
    data: [
      { name: `${NS} Chicken Burger`, description: 'Crispy', price: 5.5, imageUrl: 'http://img/x.png', isActive: true },
      { name: `${NS} Cheese Burger`, description: 'Cheesy', price: 6.0, isActive: true },
      { name: `${NS} Veggie Pizza`, description: 'Fresh', price: 8.25, isActive: true },
      { name: `${NS} Old Soup`, description: 'Gone', price: 3.0, isActive: false },
    ],
  });
});

describe('products: menu, details, search, pagination', () => {
  it('lists active products with the required fields (public)', async () => {
    const res = await request(app).get(`/api/products?search=${NS}&limit=50`);
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 3);
    const item = res.body.data.items[0];
    assert.ok(item.id && item.name && typeof item.price === 'number');
    assert.ok('image' in item && 'description' in item && 'detailsUrl' in item);
  });

  it('paginates with meta', async () => {
    const p1 = await request(app).get(`/api/products?search=${NS}&limit=2&page=1`);
    const p2 = await request(app).get(`/api/products?search=${NS}&limit=2&page=2`);
    assert.equal(p1.body.data.items.length, 2);
    assert.equal(p2.body.data.items.length, 1);
    assert.equal(p2.body.meta.totalPages, 2);
  });

  it('rejects bad pagination', async () => {
    assert.equal((await request(app).get('/api/products?page=0')).status, 400);
    assert.equal((await request(app).get('/api/products?limit=51')).status, 400);
  });

  it('searches partially and case-insensitively', async () => {
    const lower = await request(app).get('/api/products?search=chick&limit=50');
    assert.ok(lower.body.data.items.some((i) => i.name.startsWith(NS)));
    const upper = await request(app).get('/api/products?search=BURGER&limit=50');
    const mine = upper.body.data.items.filter((i) => i.name.startsWith(NS));
    assert.equal(mine.length, 2);
    const none = await request(app).get(`/api/products?search=${NS}zzzqqq`);
    assert.equal(none.body.meta.total, 0);
    assert.deepEqual(none.body.data.items, []);
  });

  it('shows details with the add-to-cart concept', async () => {
    const menu = await request(app).get('/api/products?search=Veggie%20Pizza&limit=50');
    const mine = menu.body.data.items.filter((i) => i.name.startsWith(NS));
    assert.ok(mine.length >= 1);
    const id = mine[0].id;
    const res = await request(app).get(`/api/products/${id}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.product.name.includes('Pizza'));
    assert.ok(res.body.data.product.description);
    assert.equal(res.body.navigation.next.method, 'POST');
    assert.equal(res.body.navigation.next.href, '/api/cart/items');
  });

  it('hides missing/inactive products and validates ids', async () => {
    assert.equal((await request(app).get('/api/products/999999999')).status, 404);
    assert.equal((await request(app).get('/api/products/abc')).status, 400);
    const inactive = await prisma.product.findFirst({ where: { name: `${NS} Old Soup` } });
    void uid;
    assert.equal((await request(app).get(`/api/products/${inactive.id}`)).status, 404);
  });
});
