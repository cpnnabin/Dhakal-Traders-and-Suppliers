const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-pos-token',
  'cache-control': 'no-store',
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
});

async function ensureCustomerOrdersTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS customer_orders (
      id TEXT PRIMARY KEY,
      customerId TEXT,
      customerName TEXT,
      customerPhone TEXT,
      customerEmail TEXT,
      items TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);
  try {
    await ensureCustomerOrdersTable(env.DB);
    const { results } = await env.DB.prepare('SELECT * FROM customer_orders ORDER BY created_at DESC').all();
    return json({ success: true, orders: results || [] });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON body.' }, 400); }

  const { customerId, customerName, customerPhone, customerEmail, items, total } = body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return json({ success: false, error: 'Order items are required.' }, 400);
  }

  try {
    await ensureCustomerOrdersTable(env.DB);
    const orderId = `ORD-${Date.now()}`;
    await env.DB.prepare(`
      INSERT INTO customer_orders (id, customerId, customerName, customerPhone, customerEmail, items, total, status)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending')
    `).bind(
      orderId,
      customerId ? String(customerId) : null,
      customerName ? String(customerName).trim() : null,
      customerPhone ? String(customerPhone).trim() : null,
      customerEmail ? String(customerEmail).trim() : null,
      JSON.stringify(items),
      Number(total || 0)
    ).run();

    const order = await env.DB.prepare('SELECT * FROM customer_orders WHERE id = ?1').bind(orderId).first();
    return json({ success: true, orderId, order });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
