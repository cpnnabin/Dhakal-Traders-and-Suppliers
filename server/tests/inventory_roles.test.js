import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { httpServer } from '../index.js';

test('inventory roles: cashier cannot delete product or set minStock', async (t) => {
  await new Promise((res, rej) => { try { httpServer.listen(0, res); } catch (e) { rej(e); } });
  const addr = httpServer.address();
  const port = addr && addr.port ? addr.port : 5001;
  const base = `http://127.0.0.1:${port}`;
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
  const cashierToken = jwt.sign({ email: 'cashier@dhakaltraders.com', role: 'cashier' }, secret, { expiresIn: '1h' });
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${cashierToken}` };

  const id = `role-test-${Date.now()}`;
  try {
    // create product as owner (bypass by using owner token)
    const ownerToken = jwt.sign({ email: 'owner@dhakaltraders.com', role: 'owner' }, secret, { expiresIn: '1h' });
    const createRes = await fetch(`${base}/api/products`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` }, body: JSON.stringify({ id, nameEn: 'RoleTest', stock: 1 }) });
    assert.equal(createRes.status, 200);

    // cashier tries to delete -> forbidden
    const delRes = await fetch(`${base}/api/products/${id}`, { method: 'DELETE', headers });
    assert.equal(delRes.status, 403);

    // cashier tries to set minStock -> forbidden
    const msRes = await fetch(`${base}/api/products/${id}/minstock`, { method: 'POST', headers, body: JSON.stringify({ minStock: 5 }) });
    assert.equal(msRes.status, 403);
  } finally {
    await new Promise((res) => httpServer.close(() => res()));
  }
});
