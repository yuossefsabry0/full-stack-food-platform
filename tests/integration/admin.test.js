'use strict';

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert/strict');

const { request, app, prisma, loginAs, loginDirect, login, uid } = require('../helpers');

after(() => prisma.$disconnect());

const NS = `tadm${Date.now().toString(36)}`;
let adminToken;
let adminUser;

function authed(token) {
  return { Authorization: `Bearer ${token}` };
}

before(async () => {
  const admin = await loginDirect(`ad${Date.now().toString(36)}`, 'ADMIN');
  adminToken = admin.token;
  adminUser = admin.user;
});

describe('admin dashboard and guards', () => {
  it('restricts every admin route to ADMIN and moves admin logins to the dashboard', async () => {
    assert.equal((await request(app).get('/api/admin')).status, 401);
    const basic = await loginAs(`ad${Date.now().toString(36)}b`);
    for (const path of ['/api/admin', '/api/admin/users', '/api/admin/products', '/api/admin/orders', '/api/admin/staff', '/api/admin/analytics']) {
      assert.equal((await request(app).get(path).set(authed(basic.token))).status, 403, path);
    }
    const dash = await request(app).get('/api/admin').set(authed(adminToken));
    assert.equal(dash.status, 200);
    assert.ok(dash.body.navigation.links.length >= 5);

    const logged = await login(adminUser.username, 'Secret123!');
    assert.equal(logged.body.navigation.next.rel, 'admin-dashboard');
  });

  it('lists users with only the four allowed fields', async () => {
    const res = await request(app).get('/api/admin/users?limit=5').set(authed(adminToken));
    assert.equal(res.status, 200);
    assert.ok(res.body.meta.total >= 1);
    for (const u of res.body.data.items) {
      assert.deepEqual(Object.keys(u).sort(), ['email', 'name', 'userCode', 'username']);
    }
    assert.ok(!JSON.stringify(res.body).includes('passwordHash'));
  });
});

describe('admin product management', () => {
  it('adds, edits, deactivates, never hard-deletes', async () => {
    const created = await request(app).post('/api/admin/products').set(authed(adminToken)).send({
      name: `${NS} Pizza`, price: 9.99, description: 'Yum', imageUrl: 'http://img/p.png',
    });
    assert.equal(created.status, 201);
    const id = created.body.data.product.id;

    const edited = await request(app).patch(`/api/admin/products/${id}`).set(authed(adminToken)).send({
      price: 12.5, name: `${NS} Big Pizza`, description: 'Yummy', imageUrl: 'http://img/big.png',
    });
    assert.equal(edited.body.data.product.price, 12.5);

    const off = await request(app).patch(`/api/admin/products/${id}`).set(authed(adminToken)).send({ isActive: false });
    assert.equal(off.body.data.product.isActive, false);
    const listed = await request(app).get(`/api/admin/products?search=${NS}%20Big`).set(authed(adminToken));
    assert.ok(listed.body.data.items.some((p) => p.id === id && p.isActive === false));

    assert.equal((await request(app).delete(`/api/admin/products/${id}`).set(authed(adminToken))).status, 404);
    assert.equal((await request(app).patch('/api/admin/products/999999999').set(authed(adminToken)).send({ price: 1 })).status, 404);
    assert.equal((await request(app).post('/api/admin/products').set(authed(adminToken)).send({ name: 'X', price: -1 })).status, 400);
    void uid;
  });
});

describe('admin order management', () => {
  it('filters by status/user/ids/dates, sorts, and paginates', async () => {
    const mk = (status, userId, extra) =>
      prisma.order.create({
        data: {
          userId, status, subtotal: 10, deliveryFee: 50, total: 60,
          recipientName: 'N', address: 'A', buildingNumber: '1', apartmentNumber: '2',
          streetName: 'S', phoneNumber: '+1000000', createdAt: new Date('2026-06-15T10:00:00Z'),
          ...(extra || {}),
        },
      });
    const o1 = await mk('OUT_FOR_DELIVERY', adminUser.id, { chefId: adminUser.id, deliveryId: adminUser.id });
    await mk('DELIVERED', 1, { chefId: adminUser.id, deliveryId: adminUser.id });

    const all = await request(app).get('/api/admin/orders?limit=50').set(authed(adminToken));
    assert.ok(all.body.meta.total >= 2);

    const byStatus = await request(app).get('/api/admin/orders?status=OUT_FOR_DELIVERY').set(authed(adminToken));
    assert.ok(byStatus.body.data.items.some((o) => o.id === o1.id && o.deliveryId === adminUser.id));

    const byChef = await request(app).get(`/api/admin/orders?chefId=${adminUser.id}`).set(authed(adminToken));
    assert.ok(byChef.body.meta.total >= 2);
    const byDel = await request(app).get(`/api/admin/orders?deliveryId=${adminUser.id}&status=DELIVERED`).set(authed(adminToken));
    assert.ok(byDel.body.meta.total >= 1);
    const byOrder = await request(app).get(`/api/admin/orders?orderId=${o1.id}`).set(authed(adminToken));
    assert.equal(byOrder.body.meta.total, 1);
    const byUser = await request(app).get(`/api/admin/orders?userId=${adminUser.id}`).set(authed(adminToken));
    assert.ok(byUser.body.meta.total >= 1);
    const byDate = await request(app).get('/api/admin/orders?dateFrom=2026-06-01T00:00:00.000Z&dateTo=2026-06-30T23:59:59.999Z&limit=50').set(authed(adminToken));
    assert.ok(byDate.body.data.items.some((o) => o.id === o1.id));
    const sorted = await request(app).get('/api/admin/orders?sortBy=total&sortOrder=asc&limit=50').set(authed(adminToken));
    const totals = sorted.body.data.items.map((o) => o.total);
    assert.deepEqual(totals, totals.slice().sort((a, b) => a - b));
    assert.equal((await request(app).get('/api/admin/orders?status=WRONG').set(authed(adminToken))).status, 400);
  });
});

describe('admin staff management', () => {
  it('creates CHEF/DELIVERY (never ADMIN), edits, deactivates, reactivates', async () => {
    const tag = `st${Date.now().toString(36)}`;
    const chef = await request(app).post('/api/admin/staff').set(authed(adminToken)).send({
      name: 'Chef New', username: `${tag}c`, email: `${tag}c@test.example`, password: 'Secret123!', role: 'CHEF',
    });
    assert.equal(chef.status, 201);
    assert.equal(chef.body.data.staff.role, 'CHEF');
    assert.ok(!('passwordHash' in chef.body.data.staff));

    const logged = await login(`${tag}c`, 'Secret123!');
    assert.equal(logged.status, 200);
    assert.equal(logged.body.data.user.role, 'CHEF');

    const asAdmin = await request(app).post('/api/admin/staff').set(authed(adminToken)).send({
      name: 'Sneaky', username: `${tag}s`, email: `${tag}s@test.example`, password: 'Secret123!', role: 'ADMIN',
    });
    assert.equal(asAdmin.status, 400);

    const dup = await request(app).post('/api/admin/staff').set(authed(adminToken)).send({
      name: 'Dup', username: `${tag}c`, email: `${tag}d@test.example`, password: 'Secret123!', role: 'DELIVERY',
    });
    assert.equal(dup.status, 409);

    const listed = await request(app).get('/api/admin/staff?role=CHEF&limit=50').set(authed(adminToken));
    assert.ok(listed.body.data.items.some((s) => s.username === `${tag}c`));

    const row = await prisma.user.findUnique({ where: { username: `${tag}c` } });
    const edited = await request(app).patch(`/api/admin/staff/${row.id}`).set(authed(adminToken)).send({ name: 'Chef Renamed' });
    assert.equal(edited.body.data.staff.name, 'Chef Renamed');

    await request(app).patch(`/api/admin/staff/${row.id}`).set(authed(adminToken)).send({ isActive: false });
    assert.equal((await login(`${tag}c`, 'Secret123!')).status, 401);
    const back = await request(app).patch(`/api/admin/staff/${row.id}`).set(authed(adminToken)).send({ isActive: true });
    assert.equal(back.body.data.staff.isActive, true);

    assert.equal((await request(app).patch(`/api/admin/staff/${adminUser.id}`).set(authed(adminToken)).send({ name: 'Hacked Admin' })).status, 404);
    assert.equal((await request(app).delete(`/api/admin/staff/${row.id}`).set(authed(adminToken))).status, 404);
  });
});

describe('admin analytics', () => {
  it('reports DELIVERED-only sales, units, and per-product totals', async () => {
    const p = await prisma.product.create({ data: { name: `${NS} Analytic`, description: 'd', price: 4, isActive: true } });
    const mkDelivered = (qty, total) =>
      prisma.order.create({
        data: {
          userId: adminUser.id, status: 'DELIVERED', subtotal: total - 50, deliveryFee: 50, total,
          recipientName: 'N', address: 'A', buildingNumber: '1', apartmentNumber: '2',
          streetName: 'S', phoneNumber: '+1',
          items: { create: [{ productId: p.id, productName: p.name, quantity: qty, unitPrice: 4, lineTotal: qty * 4 }] },
        },
      });
    await mkDelivered(2, 58);
    await mkDelivered(3, 62);

    const res = await request(app).get('/api/admin/analytics').set(authed(adminToken));
    assert.equal(res.status, 200);
    const entry = res.body.data.analytics.byProduct.filter((b) => b.productId === p.id)[0];
    assert.ok(entry);
    assert.equal(entry.unitsSold, 5);
    assert.ok(res.body.data.analytics.sales.year >= 120);
    assert.ok(res.body.data.analytics.unitsSold.year >= 5);
  });
});
