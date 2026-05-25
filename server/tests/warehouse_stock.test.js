import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { httpServer } from '../index.js';

test('warehouse stock: set, transfer and verify per-warehouse balances', async (t) => {
  await new Promise((res, rej) => { try { httpServer.listen(0, res); } catch (e) { rej(e); } });
  const addr = httpServer.address();
  const port = addr && addr.port ? addr.port : 5001;
  const base = `http://127.0.0.1:${port}`;
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
  const ownerToken = jwt.sign({ email: 'owner@dhakaltraders.com', role: 'owner' }, secret, { expiresIn: '1h' });
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` };

  const pid = `ws-prod-${Date.now()}`;
  const whA = `wh-a-${Date.now()}`;
  const whB = `wh-b-${Date.now()}`;
  try {
    // create product
    const cr = await fetch(`${base}/api/products`, { method: 'POST', headers, body: JSON.stringify({ id: pid, nameEn: 'WS Test', stock: 0 }) });
    assert.equal(cr.status, 200);

    // create warehouses
    const wa = await fetch(`${base}/api/inventory/warehouses`, { method: 'POST', headers, body: JSON.stringify({ id: whA, name: 'A' }) });
    assert.equal(wa.status, 200);
    const wb = await fetch(`${base}/api/inventory/warehouses`, { method: 'POST', headers, body: JSON.stringify({ id: whB, name: 'B' }) });
    assert.equal(wb.status, 200);

    // set warehouse stock: A=20, B=5
    const sA = await fetch(`${base}/api/inventory/warehouse-stock`, { method: 'POST', headers, body: JSON.stringify({ productId: pid, warehouseId: whA, qty: 20 }) });
    assert.equal(sA.status, 200);
    const sB = await fetch(`${base}/api/inventory/warehouse-stock`, { method: 'POST', headers, body: JSON.stringify({ productId: pid, warehouseId: whB, qty: 5 }) });
    assert.equal(sB.status, 200);

    // transfer 7 from A to B
    const trId = `tr-${Date.now()}`;
    const tr = await fetch(`${base}/api/inventory/transfer`, { method: 'POST', headers, body: JSON.stringify({ id: trId, productId: pid, fromWarehouseId: whA, toWarehouseId: whB, qty: 7 }) });
    assert.equal(tr.status, 200);

    // fetch warehouse stock and verify: A=13, B=12
    const res = await fetch(`${base}/api/inventory/warehouse-stock?productId=${encodeURIComponent(pid)}`);
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.success, true);
    const rows = j.rows || [];
    const a = rows.find(r => r.warehouseId === whA);
    const b = rows.find(r => r.warehouseId === whB);
    assert.ok(a && b, 'both warehouses should exist in warehouse_stock');
    assert.equal(Number(a.qty), 13);
    assert.equal(Number(b.qty), 12);
  } finally {
    await new Promise((res) => httpServer.close(() => res()));
  }
});
