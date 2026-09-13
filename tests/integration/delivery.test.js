'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const { request, app, prisma, loginDirect, uid } = require('../helpers');

after(() => prisma.$disconnect());

const NS = `tdel${Date.now().toString(36)}`;

function authed(token) {
  return { Authorization: `Bearer ${token}` };
}

async function readyOrderFixture(tag, total) {
  const p = await prisma.product.create({ data: { name: `${NS} ${tag}`, description: 'd', price: 5.5, isActive: true } });
  const order = await prisma.order.create({
    data: {
      userId: 1, status: 'READY_FOR_DELIVERY', subtotal: 11, deliveryFee: 50, total: total || 61,
      recipientName: 'Ted', address: 'Flat 5', buildingNumber: '12', apartmentNumber: '5',
      streetName: 'Main St', phoneNumber: '+1000000', chefId: 2, preparedAt: new Date(),
    },
  });
  await prisma.orderItem.create({
    data: { orderId: order.id, productId: p.id, productName: p.name, quantity: 2, unitPrice: 5.5, lineTotal: 11 },
  });
  void uid;
  return order.id;
}

describe('delivery workflow', () => {
  it('guards the area and shows full delivery data with Accept', async () => {
    const orderId = await readyOrderFixture('g1');
    const courier = await loginDirect(`dl${Date.now().toString(36)}a`, 'DELIVERY');
    const h = authed(courier.token);

    assert.equal((await request(app).get('/api/delivery/orders/current')).status, 401);
    const basic = await loginDirect(`dl${Date.now().toString(36)}b`, 'BASIC');
    assert.equal((await request(app).get('/api/delivery/orders/current').set(authed(basic.token))).status, 403);

    const res = await request(app).get('/api/delivery/orders/current').set(h);
    const found = res.body.data.items.filter((o) => o.id === orderId)[0];
    assert.ok(found);
    assert.equal(found.address.phoneNumber, '+1000000');
    assert.equal(found.address.streetName, 'Main St');
    assert.deepEqual(found.operations, [{ method: 'POST', href: `/api/delivery/orders/${orderId}/accept`, label: 'Accept' }]);
  });

  it('accepts once, enforces one active delivery, then delivers', async () => {
    const orderId = await readyOrderFixture('g2');
    const secondId = await readyOrderFixture('g3');
    const a = await loginDirect(`dl${Date.now().toString(36)}c`, 'DELIVERY');
    const b = await loginDirect(`dl${Date.now().toString(36)}d`, 'DELIVERY');

    const accepted = await request(app).post(`/api/delivery/orders/${orderId}/accept`).set(authed(a.token));
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.data.order.status, 'OUT_FOR_DELIVERY');
    assert.equal(accepted.body.data.order.deliveryId, a.user.id);
    assert.equal(accepted.body.navigation.next.label, 'Delivered');

    const race = await request(app).post(`/api/delivery/orders/${orderId}/accept`).set(authed(b.token));
    assert.equal(race.status, 409);
    assert.equal(race.body.code, 'ORDER_NOT_ACCEPTABLE');

    const busy = await request(app).post(`/api/delivery/orders/${secondId}/accept`).set(authed(a.token));
    assert.equal(busy.status, 409);
    assert.equal(busy.body.code, 'DELIVERY_BUSY');

    const wrongCourier = await request(app).post(`/api/delivery/orders/${orderId}/deliver`).set(authed(b.token));
    assert.equal(wrongCourier.status, 409);

    const done = await request(app).post(`/api/delivery/orders/${orderId}/deliver`).set(authed(a.token));
    assert.equal(done.status, 200);
    assert.equal(done.body.data.order.status, 'DELIVERED');

    const current = await request(app).get('/api/delivery/orders/current').set(authed(a.token));
    assert.ok(!current.body.data.items.some((o) => o.id === orderId));

    const previous = await request(app).get('/api/delivery/orders/previous').set(authed(a.token));
    const hist = previous.body.data.items.filter((o) => o.id === orderId)[0];
    assert.ok(hist);
    assert.equal(hist.customerName, 'Ted');
    assert.equal(hist.deliveryId, a.user.id);
    assert.ok(hist.products[0].productName.includes(NS));

    const redeliver = await request(app).post(`/api/delivery/orders/${orderId}/deliver`).set(authed(a.token));
    assert.equal(redeliver.status, 409);
    assert.equal((await request(app).post('/api/delivery/orders/999999999/accept').set(authed(a.token))).status, 404);

    // Free again after delivery.
    const fresh = await request(app).post(`/api/delivery/orders/${secondId}/accept`).set(authed(b.token));
    assert.equal(fresh.status, 200);
  });
});
