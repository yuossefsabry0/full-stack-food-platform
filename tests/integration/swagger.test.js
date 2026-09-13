'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const { request, app, prisma } = require('../helpers');
const openapi = require('../../docs/openapi.json');

after(() => prisma.$disconnect());

function mountFromRegexp(re) {
  const src = (re && re.source) || '';
  const stripped = src.replace(/^\^\\\//, '');
  const end = stripped.indexOf('\\/');
  const clean = (end === -1 ? stripped : stripped.slice(0, end)).replace(/[^a-zA-Z0-9/_-]/g, '');
  return clean ? `/${clean}` : '/';
}

function collectRoutes(stack, prefix) {
  const out = [];
  for (const layer of stack || []) {
    if (layer.route && layer.route.path !== undefined) {
      const methods = Object.keys(layer.route.methods || {}).filter((m) => layer.route.methods[m]);
      const full = `${prefix}${layer.route.path}`.replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
      for (const method of methods) {
        out.push(`${method.toUpperCase()} ${full.replace(/:([A-Za-z0-9_]+)/g, '{$1}')}`);
      }
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      out.push(...collectRoutes(layer.handle.stack, `${prefix}${mountFromRegexp(layer.regexp)}`.replace(/\/+/g, '/')));
    }
  }
  return out;
}

describe('swagger coverage', () => {
  it('serves the UI and the machine-readable document', async () => {
    const doc = await request(app).get('/api/docs.json');
    assert.equal(doc.status, 200);
    assert.equal(doc.body.openapi, '3.0.3');
    const ui = await request(app).get('/api/docs/');
    assert.equal(ui.status, 200);
    assert.ok(ui.text.includes('swagger'));
  });

  it('documents every registered API route', () => {
    const routes = collectRoutes(app._router.stack, '').filter((r) => !r.includes('/api/docs'));
    assert.ok(routes.length >= 30, `expected 30+ routes, got ${routes.length}`);
    const documented = new Set();
    for (const [path, methods] of Object.entries(openapi.paths)) {
      for (const method of Object.keys(methods)) {
        documented.add(`${method.toUpperCase()} ${path}`);
      }
    }
    const missing = routes.filter((r) => !documented.has(r));
    assert.deepEqual(missing, []);
  });

  it('contains no stale paths missing from the router', () => {
    const routes = new Set(collectRoutes(app._router.stack, '').filter((r) => !r.includes('/api/docs')));
    const documented = [];
    for (const [path, methods] of Object.entries(openapi.paths)) {
      if (path.startsWith('/api/docs')) continue;
      for (const method of Object.keys(methods)) {
        documented.push(`${method.toUpperCase()} ${path}`);
      }
    }
    const stale = documented.filter((r) => !routes.has(r));
    assert.deepEqual(stale, []);
  });
});
