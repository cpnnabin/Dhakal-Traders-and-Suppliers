import jwt from 'jsonwebtoken';

const base = 'http://127.0.0.1:5001';
const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
const ownerToken = jwt.sign({ email: 'owner@dhakaltraders.com', role: 'owner' }, secret, { expiresIn: '1h' });
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` };

async function run() {
  const pid = `ws-debug-${Date.now()}`;
  const whA = `wh-a-debug`;
  const whB = `wh-b-debug`;
  console.log('create product', pid);
  console.log(await (await fetch(`${base}/api/products`, { method: 'POST', headers, body: JSON.stringify({ id: pid, nameEn: 'Debug', stock: 0 }) })).json());
  console.log('create warehouses');
  console.log(await (await fetch(`${base}/api/inventory/warehouses`, { method: 'POST', headers, body: JSON.stringify({ id: whA, name: 'A' }) })).json());
  console.log(await (await fetch(`${base}/api/inventory/warehouses`, { method: 'POST', headers, body: JSON.stringify({ id: whB, name: 'B' }) })).json());
  console.log('set warehouse A=20');
  console.log(await (await fetch(`${base}/api/inventory/warehouse-stock`, { method: 'POST', headers, body: JSON.stringify({ productId: pid, warehouseId: whA, qty: 20 }) })).json());
  console.log('set warehouse B=5');
  console.log(await (await fetch(`${base}/api/inventory/warehouse-stock`, { method: 'POST', headers, body: JSON.stringify({ productId: pid, warehouseId: whB, qty: 5 }) })).json());
  console.log('transfer 7 from A to B');
  const trId = `tr-${Date.now()}`;
  console.log(await (await fetch(`${base}/api/inventory/transfer`, { method: 'POST', headers, body: JSON.stringify({ id: trId, productId: pid, fromWarehouseId: whA, toWarehouseId: whB, qty: 7 }) })).json());
  console.log('fetch warehouse stock');
  console.log(await (await fetch(`${base}/api/inventory/warehouse-stock?productId=${encodeURIComponent(pid)}`)).json());
}

run().catch(e => { console.error(e); process.exit(1); });
