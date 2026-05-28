// functions/api/orders.js — local copy for express/worker compatibility when running locally
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-pos-token',
  'cache-control': 'no-store',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });

async function ensureOrdersTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      productId TEXT,
      productName TEXT NOT NULL,
      qty INTEGER NOT NULL,
      customerName TEXT,
      customerPhone TEXT,
      customerEmail TEXT,
      address TEXT,
      note TEXT,
      customerId TEXT,
      customerDetails TEXT,
      cartItems TEXT,
      totals TEXT,
      paymentMode TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const info = await db.prepare('PRAGMA table_info(orders)').all();
  const columns = new Set((info?.results ?? []).map((c) => c.name));
  for (const [name, type] of [
    ['customerId', 'TEXT'],
    ['customerDetails', 'TEXT'],
    ['cartItems', 'TEXT'],
    ['totals', 'TEXT'],
    ['paymentMode', 'TEXT'],
  ]) {
    if (!columns.has(name)) {
      await db.prepare(`ALTER TABLE orders ADD COLUMN ${name} ${type}`).run();
    }
  }
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);
  try {
    await ensureOrdersTable(env.DB);
    const { results } = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    return json({ success: true, orders: results });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON body.' }, 400); }

  const { id, productId, productName, qty, customerName, customerPhone, customerEmail, address, note, status, customerId, customerDetails, cartItems, totals, paymentMode } = body;
  const isStructured = Array.isArray(cartItems) && cartItems.length > 0;
  if (!id || (!isStructured && (!productName || !qty))) return json({ success: false, error: 'Required fields missing.' }, 400);

  try {
    await ensureOrdersTable(env.DB);
    await env.DB.prepare(
      `INSERT INTO orders (id, productId, productName, qty, customerName, customerPhone, customerEmail, address, note, customerId, customerDetails, cartItems, totals, paymentMode, status)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`
    ).bind(
      id.trim(),
      isStructured ? null : (productId ? String(productId).trim() : null),
      isStructured ? `Order #${String(id).trim()}` : String(productName).trim(),
      isStructured ? Number((totals && (totals.totalItems || totals.quantity)) || cartItems.length || 1) : Number(qty),
      customerName ? String(customerName).trim() : null,
      customerPhone ? String(customerPhone).trim() : null,
      customerEmail ? String(customerEmail).trim() : null,
      address ? String(address).trim() : null,
      note ? String(note).trim() : null,
      customerId ? String(customerId).trim() : null,
      customerDetails ? JSON.stringify(customerDetails) : null,
      isStructured ? JSON.stringify(cartItems) : null,
      totals ? JSON.stringify(totals) : null,
      paymentMode ? String(paymentMode).trim() : null,
      status || 'pending'
    ).run();

    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?1').bind(id.trim()).first();
    return json({ success: true, order });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
