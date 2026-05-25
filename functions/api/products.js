// client/functions/api/products.js
// ─── Cloudflare Pages Function: POS Products D1 Management ────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-pos-token',
  'cache-control': 'no-store',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });

async function ensureProductsTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id            TEXT PRIMARY KEY,
      nameEn        TEXT NOT NULL,
      nameNe        TEXT NOT NULL,
      category      TEXT NOT NULL,
      stock         REAL NOT NULL,
      unit          TEXT NOT NULL,
      purchasePrice REAL NOT NULL,
      sellingPrice  REAL NOT NULL,
      emoji         TEXT DEFAULT '📦',
      status        TEXT DEFAULT 'active'
    )
  `).run();
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

// GET /api/products
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  try {
    await ensureProductsTable(env.DB);
    const { results } = await env.DB.prepare('SELECT * FROM products').all();
    return json({ success: true, products: results });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

// POST /api/products
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400);
  }

  const { id, nameEn, nameNe, category, stock, unit, purchasePrice, sellingPrice, emoji, status } = body;

  if (!id || !nameEn || !nameNe || !category || stock === undefined || !unit || purchasePrice === undefined || sellingPrice === undefined) {
    return json({ success: false, error: 'Required fields missing.' }, 400);
  }

  try {
    await ensureProductsTable(env.DB);

    // Upsert equivalent in SQLite (INSERT OR REPLACE)
    await env.DB.prepare(`
      INSERT INTO products (id, nameEn, nameNe, category, stock, unit, purchasePrice, sellingPrice, emoji, status)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      ON CONFLICT(id) DO UPDATE SET
        nameEn = excluded.nameEn,
        nameNe = excluded.nameNe,
        category = excluded.category,
        stock = excluded.stock,
        unit = excluded.unit,
        purchasePrice = excluded.purchasePrice,
        sellingPrice = excluded.sellingPrice,
        emoji = excluded.emoji,
        status = excluded.status
    `).bind(
      id.trim(),
      nameEn.trim(),
      nameNe.trim(),
      category.trim(),
      Number(stock),
      unit.trim(),
      Number(purchasePrice),
      Number(sellingPrice),
      emoji || '📦',
      status || 'active'
    ).run();

    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?1').bind(id.trim()).first();
    return json({ success: true, product });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

// DELETE /api/products?id=XXX
export async function onRequestDelete({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return json({ success: false, error: 'Product ID is required.' }, 400);
  }

  try {
    await ensureProductsTable(env.DB);
    await env.DB.prepare('DELETE FROM products WHERE id = ?1').bind(id.trim()).run();
    return json({ success: true, id });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
