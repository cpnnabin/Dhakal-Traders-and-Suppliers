// client/functions/api/purchases.js
// ─── Cloudflare Pages Function: POS Purchases D1 Management ──────────────────

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

async function ensurePurchasesTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS purchases (
      id           TEXT PRIMARY KEY,
      farmerName   TEXT NOT NULL,
      productName  TEXT NOT NULL,
      qtyKg        REAL NOT NULL,
      rate         REAL NOT NULL,
      total        REAL NOT NULL,
      date         TEXT NOT NULL,
      created_at   TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

// GET /api/purchases
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  try {
    await ensurePurchasesTable(env.DB);
    const { results } = await env.DB.prepare('SELECT * FROM purchases ORDER BY created_at DESC').all();
    return json({ success: true, purchases: results });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

// POST /api/purchases
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400);
  }

  const { id, farmerName, productName, qtyKg, rate, total, date } = body;

  if (!id || !farmerName || !productName || qtyKg === undefined || rate === undefined || total === undefined || !date) {
    return json({ success: false, error: 'Required fields missing.' }, 400);
  }

  try {
    await ensurePurchasesTable(env.DB);

    await env.DB.prepare(`
      INSERT INTO purchases (id, farmerName, productName, qtyKg, rate, total, date)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    `).bind(
      id.trim(),
      farmerName.trim(),
      productName.trim(),
      Number(qtyKg),
      Number(rate),
      Number(total),
      date.trim()
    ).run();

    const purchase = await env.DB.prepare('SELECT * FROM purchases WHERE id = ?1').bind(id.trim()).first();
    return json({ success: true, purchase });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
