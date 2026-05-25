const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-pos-token',
  'cache-control': 'no-store',
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
});

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON body.' }, 400); }

  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const email = String(body.email || '').trim();
  const password = String(body.password || phone || '').trim();
  if (!name || !phone || !password) return json({ success: false, error: 'Name, phone and password are required.' }, 400);

  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS pos_customers (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        login_id           TEXT,
        name               TEXT NOT NULL,
        phone              TEXT NOT NULL,
        email              TEXT,
        address            TEXT,
        productToBuy       TEXT,
        type               TEXT DEFAULT 'retail',
        password           TEXT,
        panNo              TEXT,
        alternativeAddress TEXT,
        alternativePhone   TEXT,
        created_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    const loginId = email || phone;
    const exists = await env.DB.prepare('SELECT id FROM pos_customers WHERE login_id = ?1 OR phone = ?2 OR email = ?3').bind(loginId, phone, email).first();
    if (exists) return json({ success: false, error: 'Account already exists.' }, 409);

    const hashLike = password; // customer portal password kept simple for parity with existing local flow
    await env.DB.prepare(
      'INSERT INTO pos_customers (login_id, name, phone, email, password) VALUES (?1, ?2, ?3, ?4, ?5)'
    ).bind(loginId, name, phone, email || null, hashLike).run();

    const created = await env.DB.prepare('SELECT id, login_id, name, phone, email FROM pos_customers WHERE login_id = ?1 OR phone = ?2 ORDER BY id DESC').bind(loginId, phone).first();

    return json({
      success: true,
      customerId: String(created.id),
      name: created.name,
      login_id: created.login_id || '',
      customer: {
        id: String(created.id),
        _id: String(created.id),
        login_id: created.login_id || '',
        name: created.name,
        phone: created.phone,
        email: created.email || '',
      },
    });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
