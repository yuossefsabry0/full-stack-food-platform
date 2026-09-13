'use strict';

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert/strict');

const { request, app, prisma, loginAs } = require('../helpers');

after(() => prisma.$disconnect());

const NS = `tord${Date.now().toString(36)}`;
let productId;

const ADDRESS = {
  name: 'Ted', address: 'Flat 5', buildingNumber: '12',
  apartmentNumber: '5', streetName: 'Main St', phoneNumber: '+1000000',
};

function authed(token) {
  return { Authorization: `Bearer ${token}` };
}

before(async () => {
  const p = await prisma.product.create({ data: { name: `${NS} Burger`, description: 'd', price: 5.5, isActive: true } });
  productId = p.id;
});

describe('orders: confirm, checkout, rules, reads', () => {
  it('confirms with totals and moves to the delivery address route', async () => {
    const { token } = await loginAs(`o${Date.now().toString(36)}a`);
    const h = authed(token);
    assert.equal((await request(app).post('/api/cart/confirm').set(h)).status, 400);
    await request(app).post('/api/cart/items').set(h).send({ productId, quantity: 2 });
    const res = await request(app).post('/api/cart/confirm').set(h);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.preview.productsTotal, 11);
    assert.equal(res.body.data.preview.deliveryFee, 50);
    assert.equal(res.body.data.preview.totalAmount, 61);
    assert.equal(res.body.navigation.next.rel, 'delivery-address');
  });

  it('refuses incomplete addresses and creates nothing', async () => {
    const { token } = await loginAs(`o${Date.now().toString(36)}b`);
    const h = authed(token);
    await request(app).post('/api/cart/items').set(h).send({ productId });
    const before = await prisma.order.count();
    const res = await request(app).post('/api/orders/checkout').set(h).send({ name: 'Ted' });
    assert.equal(res.status, 400);
    assert.equal(await prisma.order.count(), before);
  });

  it('creates the order with snapshots, totals, and a cleared cart', async () => {
    const { token, payload } = await loginAs(`o${Date.now().toString(36)}c`);
    const h = authed(token);
    await request(app).post('/api/cart/items').set(h).send({ productId, quantity: 2 });
    const res = await request(app).post('/api/orders/checkout').set(h).send(ADDRESS);
    assert.equal(res.status, 201);
    const order = res.body.data.order;
    assert.equal(order.status, 'PENDING');
    assert.equal(order.statusLabel, 'In Progress');
    assert.equal(order.productsTotal, 11);
    assert.equal(order.deliveryFee, 50);
    assert.equal(order.total, 61);
    assert.equal(order.items[0].productName, `${NS} Burger`);
    assert.equal(order.items[0].unitPrice, 5.5);
    assert.equal(order.items[0].quantity, 2);
    assert.equal(order.items[0].subtotal, 11);
    assert.equal(res.body.navigation.next.rel, 'orders');

    const cart = await request(app).get('/api/cart').set(h);
    assert.deepEqual(cart.body.data.cart.items, []);

    // Snapshots survive later product edits.
    await prisma.product.update({ where: { id: productId }, data: { price: 99.99, name: 'RENAMED' } });
    const reread = await request(app).get(`/api/orders/${order.id}`).set(h);
    assert.equal(reread.body.data.order.items[0].unitPrice, 11 / 2);
    assert.equal(reread.body.data.order.total, 61);
    void payload;
  });

  it('enforces one active order and isolates users', async () => {
    const a = await loginAs(`o${Date.now().toString(36)}d`);
    const b = await loginAs(`o${Date.now().toString(36)}e`);
    await request(app).post('/api/cart/items').set(authed(a.token)).send({ productId });
    const first = await request(app).post('/api/orders/checkout').set(authed(a.token)).send(ADDRESS);
    assert.equal(first.status, 201);

    await request(app).post('/api/cart/items').set(authed(a.token)).send({ productId });
    const second = await request(app).post('/api/orders/checkout').set(authed(a.token)).send(ADDRESS);
    assert.equal(second.status, 409);
    assert.equal(second.body.code, 'ACTIVE_ORDER_EXISTS');

    // Another user's order is invisible.
    const snooping = await request(app).get(`/api/orders/${first.body.data.order.id}`).set(authed(b.token));
    assert.equal(snooping.status, 404);

    // After delivery, ordering works again.
    await prisma.order.update({ where: { id: first.body.data.order.id }, data: { status: 'DELIVERED' } });
    const third = await request(app).post('/api/orders/checkout').set(authed(a.token)).send(ADDRESS);
    assert.equal(third.status, 201);
  });

  it('lists own orders with pagination', async () => {
    const { token } = await loginAs(`o${Date.now().toString(36)}f`);
    const h = authed(token);
    await request(app).post('/api/cart/items').set(h).send({ productId });
    await request(app).post('/api/orders/checkout').set(h).send(ADDRESS);
    const list = await request(app).get('/api/orders?page=1&limit=10').set(h);
    assert.equal(list.status, 200);
    assert.equal(list.body.meta.total, 1);
    assert.ok(list.body.data.items[0].total > 0);
    assert.equal((await request(app).get('/api/orders?page=0').set(h)).status, 400);
    assert.equal((await request(app).get('/api/orders')).status, 401);
  });
});
