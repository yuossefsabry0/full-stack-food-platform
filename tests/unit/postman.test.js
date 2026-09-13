'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

require('../setup');
const collection = require('../../postman/food-platform-api.postman_collection.json');

const EXPECTED_FOLDERS = [
  'Authentication', 'Users', 'Products', 'Cart', 'Orders',
  'CHEF', 'DELIVERY', 'ADMIN', 'Analytics',
];

function flattenItems(items, acc) {
  for (const entry of items || []) {
    if (entry.item) flattenItems(entry.item, acc);
    else if (entry.request) acc.push(entry);
  }
  return acc;
}

describe('postman collection', () => {
  it('organizes all modules into the required folders', () => {
    const names = (collection.item || []).map((f) => f.name).sort();
    assert.deepEqual(names, EXPECTED_FOLDERS.slice().sort());
  });

  it('gives every request a method, URL, and needed bodies/headers', () => {
    const requests = flattenItems(collection.item, []);
    assert.ok(requests.length >= 30, `expected 30+ requests, got ${requests.length}`);
    // POST routes that intentionally carry no body.
    const bodyless = ['/api/cart/confirm', '/prepare', '/accept', '/deliver'];
    for (const entry of requests) {
      const req = entry.request;
      assert.ok(req.method, `${entry.name} missing method`);
      assert.ok(req.url, `${entry.name} missing url`);
      const url = typeof req.url === 'string' ? req.url : req.url.raw;
      if (['POST', 'PATCH', 'PUT'].includes(req.method) && !bodyless.some((p) => url.includes(p))) {
        assert.ok(req.body && req.body.raw, `${entry.name} missing body`);
        const headers = req.header || [];
        assert.ok(headers.some((h) => h.key === 'Content-Type'), `${entry.name} missing content type`);
      }
    }
  });

  it('covers every API route family', () => {
    const requests = flattenItems(collection.item, []);
    const urls = requests.map((e) => (typeof e.request.url === 'string' ? e.request.url : e.request.url.raw).replace('{{baseUrl}}', ''));
    for (const prefix of ['/api/auth/', '/api/products', '/api/cart', '/api/orders', '/api/chef/', '/api/delivery/', '/api/admin']) {
      assert.ok(urls.some((u) => u.startsWith(prefix)), `no request for ${prefix}`);
    }
  });
});
