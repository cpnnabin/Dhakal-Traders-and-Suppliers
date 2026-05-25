import test from 'node:test';
import assert from 'node:assert/strict';
import { httpServer } from '../index.js';

test('smoke: health and products endpoints', async (t) => {
  // Start server on ephemeral port
  await new Promise((res, rej) => {
    try { httpServer.listen(0, res); } catch (e) { rej(e); }
  });

  const addr = httpServer.address();
  const port = addr && addr.port ? addr.port : 5001;
  const base = `http://127.0.0.1:${port}`;

  try {
    const h = await fetch(`${base}/api/health`);
    assert.equal(h.status, 200);
    const hjson = await h.json();
    assert.equal(hjson.status, 'ok');

    const p = await fetch(`${base}/api/products`);
    assert.equal(p.status, 200);
    const pjson = await p.json();
    assert.equal(typeof pjson.success, 'boolean');
    assert.ok(Array.isArray(pjson.products));
  } finally {
    // close the server
    await new Promise((res) => httpServer.close(() => res()));
  }
});
