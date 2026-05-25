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

  const loginId = String(body.login_id || body.email || body.phone || '').trim();
  const password = String(body.password || '').trim();
  if (!loginId || !password) return json({ success: false, error: 'Login ID and password are required.' }, 400);

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

    const customer = await env.DB.prepare(
      'SELECT id, login_id, name, phone, email, password FROM pos_customers WHERE login_id = ?1 OR phone = ?1 OR email = ?1'
    ).bind(loginId).first();

    if (!customer) return json({ success: false, error: 'Invalid credentials.' }, 401);

    const expected = String(customer.password || customer.phone || '12345').trim();
    if (expected !== password) return json({ success: false, error: 'Invalid credentials.' }, 401);

    return json({
      success: true,
      customer: {
        id: String(customer.id),
        _id: String(customer.id),
        login_id: customer.login_id || '',
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
      },
    });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
