import bcrypt from 'bcryptjs';

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

const sha256Hex = async (text) => {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

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
  const loginId = String(email || phone || name).trim();
  const username = String(body.username || loginId).trim();

  try {
    const existing = await env.DB.prepare(
      'SELECT id FROM login WHERE role = ?1 AND (LOWER(email) = LOWER(?2) OR LOWER(username) = LOWER(?3) OR phone = ?4)'
    ).bind('customer', loginId, username, phone).first();
    if (existing) return json({ success: false, error: 'Account already exists.' }, 409);

    const passwordHash = bcrypt.hashSync(password, 10);
    await env.DB.prepare(
      'INSERT INTO login (full_name, username, email, role, phone, password_hash, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
    ).bind(name, username, email || loginId.toLowerCase(), 'customer', phone, passwordHash, 'active').run();

    const loginRow = await env.DB.prepare(
      'SELECT id, email, username, full_name, phone FROM login WHERE role = ?1 AND (LOWER(email) = LOWER(?2) OR LOWER(username) = LOWER(?3) OR phone = ?4) ORDER BY id DESC'
    ).bind('customer', loginId, username, phone).first();

    const customerInsert = await env.DB.prepare(
      'INSERT INTO customers (login_id, full_name, phone, email) VALUES (?1, ?2, ?3, ?4)'
    ).bind(loginRow.id, name, phone, email || null).run();

    const created = await env.DB.prepare(
      'SELECT id, login_id, full_name, phone, email FROM customers WHERE login_id = ?1'
    ).bind(loginRow.id).first();

    return json({
      success: true,
      customerId: String(created?.id || customerInsert.meta?.last_row_id || ''),
      name: created?.full_name || name,
      login_id: String(loginRow.id),
      customer: {
        id: String(created?.id || customerInsert.meta?.last_row_id || ''),
        _id: String(created?.id || customerInsert.meta?.last_row_id || ''),
        login_id: String(loginRow.id),
        name: created?.full_name || name,
        full_name: created?.full_name || name,
        phone: created?.phone || phone,
        email: created?.email || email || loginId || '',
      },
    });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
