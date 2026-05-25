import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { httpServer } from '../index.js';

test('inventory: product create and stock in/out with auth', async (t) => {
  // start server
  await new Promise((res, rej) => { try { httpServer.listen(0, res); } catch (e) { rej(e); } });
  const addr = httpServer.address();
  const port = addr && addr.port ? addr.port : 5001;
  const base = `http://127.0.0.1:${port}`;

  // create JWT token using same secret as server
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
  const token = jwt.sign({ email: 'admin@dhakaltraders.com', role: 'owner' }, secret, { expiresIn: '1h' });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const id = `test-prod-${Date.now()}`;
  try {
    // Unauthorized attempt should fail
    const badRes = await fetch(`${base}/api/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'x', nameEn: 'x' }) });
    assert.equal(badRes.status, 401);

    // Create product
    const createRes = await fetch(`${base}/api/products`, { method: 'POST', headers, body: JSON.stringify({ id, nameEn: 'Test Product', stock: 5, unit: 'pcs', purchasePrice: 10, sellingPrice: 15, minStock: 2 }) });
    assert.equal(createRes.status, 200);
    const createJson = await createRes.json();
    assert.equal(createJson.success, true);
    assert.equal(createJson.product.id, id);

    // Stock IN
    const inId = `in-${Date.now()}`;
    const inRes = await fetch(`${base}/api/stock`, { method: 'POST', headers, body: JSON.stringify({ id: inId, productId: id, qty: 10, type: 'in' }) });
    assert.equal(inRes.status, 200);
    const inJson = await inRes.json();
    assert.equal(inJson.success, true);

    // Verify stock increased to 15
    const getRes = await fetch(`${base}/api/products/${id}`);
    assert.equal(getRes.status, 200);
    const getJson = await getRes.json();
    assert.equal(getJson.success, true);
    assert.equal(Number(getJson.product.stock), 15);

    // Stock OUT
    const outId = `out-${Date.now()}`;
    const outRes = await fetch(`${base}/api/stock`, { method: 'POST', headers, body: JSON.stringify({ id: outId, productId: id, qty: 4, type: 'out' }) });
    assert.equal(outRes.status, 200);
    const outJson = await outRes.json();
    assert.equal(outJson.success, true);

    // Verify stock decreased to 11
    const getRes2 = await fetch(`${base}/api/products/${id}`);
    const getJson2 = await getRes2.json();
    assert.equal(Number(getJson2.product.stock), 11);
  } finally {
    await new Promise((res) => httpServer.close(() => res()));
  }
});
