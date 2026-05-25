// client/functions/api/sales.js
// ─── Cloudflare Pages Function: POS Sales (Orders) D1 Management ──────────────

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

async function ensureSalesTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS sales (
      id           TEXT PRIMARY KEY,
      items        TEXT NOT NULL,
      subtotal     REAL NOT NULL,
      discount     REAL NOT NULL,
      tax          REAL NOT NULL,
      total        REAL NOT NULL,
      date         TEXT NOT NULL,
      cashier      TEXT NOT NULL,
      customerId   TEXT,
      paymentMode  TEXT DEFAULT 'Cash',
      created_at   TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

// GET /api/sales
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  try {
    await ensureSalesTable(env.DB);
    const { results } = await env.DB.prepare('SELECT * FROM sales ORDER BY created_at DESC').all();
    
    // Map items column back to JS Array
    const sales = results.map(s => ({
      ...s,
      items: JSON.parse(s.items)
    }));

    return json({ success: true, sales });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

// POST /api/sales
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400);
  }

  const { id, items, subtotal, discount, tax, total, date, cashier, customerId, paymentMode } = body;

  if (!id || !items || subtotal === undefined || total === undefined || !date || !cashier) {
    return json({ success: false, error: 'Required fields missing.' }, 400);
  }

  try {
    await ensureSalesTable(env.DB);

    const itemsStr = typeof items === 'string' ? items : JSON.stringify(items);

    await env.DB.prepare(`
      INSERT INTO sales (id, items, subtotal, discount, tax, total, date, cashier, customerId, paymentMode)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
    `).bind(
      id.trim(),
      itemsStr,
      Number(subtotal),
      Number(discount || 0),
      Number(tax || 0),
      Number(total),
      date.trim(),
      cashier.trim(),
      customerId ? String(customerId).trim() : null,
      paymentMode || 'Cash'
    ).run();

    const sale = await env.DB.prepare('SELECT * FROM sales WHERE id = ?1').bind(id.trim()).first();
    sale.items = JSON.parse(sale.items);

    return json({ success: true, sale });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
