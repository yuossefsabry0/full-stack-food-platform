'use strict';

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert/strict');

const { request, app, prisma, loginAs, uid } = require('../helpers');

after(() => prisma.$disconnect());

const NS = `tcart${Date.now().toString(36)}`;
let productId;
let inactiveId;

before(async () => {
  const p = await prisma.product.create({ data: { name: `${NS} Burger`, description: 'd', price: 5.5, isActive: true } });
  const q = await prisma.product.create({ data: { name: `${NS} Gone`, description: 'd', price: 1.0, isActive: false } });
  productId = p.id;
  inactiveId = q.id;
  void uid;
});

function authed(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('cart', () => {
  it('requires authentication', async () => {
    assert.equal((await request(app).get('/api/cart')).status, 401);
    assert.equal((await request(app).post('/api/cart/items').send({ productId })).status, 401);
  });

  it('adds, merges, increases, sets, decreases, and deletes', async () => {
    const { token } = await loginAs(`c${Date.now().toString(36)}a`);
    const h = authed(token);

    let res = await request(app).get('/api/cart').set(h);
    assert.deepEqual(res.body.data.cart.items, []);

    res = await request(app).post('/api/cart/items').set(h).send({ productId, quantity: 2 });
    assert.equal(res.body.data.cart.items[0].quantity, 2);
    assert.equal(res.body.data.cart.total, 11);

    res = await request(app).post('/api/cart/items').set(h).send({ productId, quantity: 1 });
    assert.equal(res.body.data.cart.items.length, 1);
    assert.equal(res.body.data.cart.items[0].quantity, 3);

    res = await request(app).patch(`/api/cart/items/${productId}`).set(h).send({ action: 'increase' });
    assert.equal(res.body.data.cart.items[0].quantity, 4);

    res = await request(app).patch(`/api/cart/items/${productId}`).set(h).send({ quantity: 2 });
    assert.equal(res.body.data.cart.items[0].quantity, 2);

    res = await request(app).patch(`/api/cart/items/${productId}`).set(h).send({ action: 'decrease' });
    assert.equal(res.body.data.cart.items[0].quantity, 1);

    res = await request(app).patch(`/api/cart/items/${productId}`).set(h).send({ action: 'decrease' });
    assert.deepEqual(res.body.data.cart.items, []);

    res = await request(app).delete(`/api/cart/items/${productId}`).set(h);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'CART_ITEM_NOT_FOUND');
  });

  it('isolates carts per user and blocks unavailable products', async () => {
    const a = await loginAs(`c${Date.now().toString(36)}b`);
    const b = await loginAs(`c${Date.now().toString(36)}c`);
    await request(app).post('/api/cart/items').set(authed(a.token)).send({ productId });
    const other = await request(app).get('/api/cart').set(authed(b.token));
    assert.deepEqual(other.body.data.cart.items, []);
    const touch = await request(app).patch(`/api/cart/items/${productId}`).set(authed(b.token)).send({ action: 'increase' });
    assert.equal(touch.status, 404);

    const inact = await request(app).post('/api/cart/items').set(authed(a.token)).send({ productId: inactiveId });
    assert.equal(inact.status, 404);
    assert.equal(inact.body.code, 'PRODUCT_NOT_AVAILABLE');
  });

  it('validates cart input', async () => {
    const { token } = await loginAs(`c${Date.now().toString(36)}d`);
    const h = authed(token);
    assert.equal((await request(app).post('/api/cart/items').set(h).send({ productId: 'x' })).status, 400);
    assert.equal((await request(app).post('/api/cart/items').set(h).send({ productId, quantity: 0 })).status, 400);
    assert.equal((await request(app).patch(`/api/cart/items/${productId}`).set(h).send({})).status, 400);
    assert.equal((await request(app).delete('/api/cart/items/abc').set(h)).status, 400);
  });
});
