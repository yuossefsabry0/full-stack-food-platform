'use strict';

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert/strict');

const { request, app, prisma, loginAs, loginDirect } = require('../helpers');

after(() => prisma.$disconnect());

const NS = `tchef${Date.now().toString(36)}`;
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

async function pendingOrderFixture(tag) {
  const customer = await loginAs(tag);
  const h = authed(customer.token);
  await request(app).post('/api/cart/items').set(h).send({ productId, quantity: 2 });
  const created = await request(app).post('/api/orders/checkout').set(h).send(ADDRESS);
  assert.equal(created.status, 201);
  return created.body.data.order.id;
}

describe('chef workflow', () => {
  it('logs chefs in through the shared route and guards the area', async () => {
    const chef = await loginDirect(`ch${Date.now().toString(36)}`, 'CHEF');
    assert.ok(chef.token);
    assert.equal((await request(app).get('/api/chef/requests')).status, 401);
    const basic = await loginAs(`ch${Date.now().toString(36)}b`);
    assert.equal((await request(app).get('/api/chef/requests').set(authed(basic.token))).status, 403);
    assert.equal((await request(app).post('/api/chef/requests/1/prepare').set(authed(basic.token))).status, 403);
  });

  it('prepares PENDING orders through to READY_FOR_DELIVERY with chefId', async () => {
    const orderId = await pendingOrderFixture(`ch${Date.now().toString(36)}c`);
    const chef = await loginDirect(`ch${Date.now().toString(36)}d`, 'CHEF');
    const h = authed(chef.token);

    const requests = await request(app).get('/api/chef/requests').set(h);
    const found = requests.body.data.items.filter((o) => o.id === orderId)[0];
    assert.ok(found);
    assert.equal(found.items[0].quantity, 2);
    assert.equal(found.chefId, null);

    const prepared = await request(app).post(`/api/chef/requests/${orderId}/prepare`).set(h);
    assert.equal(prepared.status, 200);
    assert.equal(prepared.body.data.order.status, 'READY_FOR_DELIVERY');
    assert.equal(prepared.body.data.order.statusLabel, 'Ready for Delivery');
    assert.equal(prepared.body.data.order.chefId, chef.user.id);
    assert.ok(prepared.body.data.order.preparedAt);

    const after = await request(app).get('/api/chef/requests').set(h);
    assert.ok(!after.body.data.items.some((o) => o.id === orderId));

    const history = await request(app).get('/api/chef/history').set(h);
    assert.ok(history.body.data.items.some((o) => o.id === orderId && o.chefId === chef.user.id));

    const again = await request(app).post(`/api/chef/requests/${orderId}/prepare`).set(h);
    assert.equal(again.status, 409);
    assert.equal((await request(app).post('/api/chef/requests/999999999/prepare').set(h)).status, 404);
    assert.equal((await request(app).post('/api/chef/requests/abc/prepare').set(h)).status, 400);
  });
});
