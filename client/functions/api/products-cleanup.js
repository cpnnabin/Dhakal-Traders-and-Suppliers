// client/functions/api/products-cleanup.js
// Delete test products from D1 (use carefully)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// POST /api/products-cleanup
// Body: { match: string } -- we'll delete rows where nameEn/nameNe LIKE %match% OR status = match
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400);
  }

  const match = String((body && body.match) || '').trim();
  if (!match) return json({ success: false, error: 'match is required in body' }, 400);

  try {
    await ensureProductsTable(env.DB);

    // Safeguard: only allow short matches (to avoid accidental full wipe) unless explicit confirm=true
    const confirm = !!body.confirm;
    if (!confirm && match.length < 2) {
      return json({ success: false, error: 'match too short; set confirm=true to override' }, 400);
    }

    // Perform deletion
    const like = `%${match.replace(/%/g, '')}%`;
    const deleteSql = `DELETE FROM products WHERE LOWER(nameEn) LIKE LOWER(?1) OR LOWER(nameNe) LIKE LOWER(?1) OR LOWER(status) = LOWER(?2)`;
    const res = await env.DB.prepare(deleteSql).bind(like, match).run();

    // D1 returns a 'results' for SELECT; for run() it may not provide changes; to be safe, return remaining count
    const remaining = await env.DB.prepare('SELECT COUNT(*) as c FROM products').first();

    return json({ success: true, deletedMatch: match, remaining: remaining.c || 0 });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
