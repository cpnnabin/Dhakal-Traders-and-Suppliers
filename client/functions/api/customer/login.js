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

  const loginId = String(body.login_id || body.email || body.phone || '').trim();
  const password = String(body.password || '').trim();
  if (!loginId || !password) return json({ success: false, error: 'Login ID and password are required.' }, 400);

  try {
    const customer = await env.DB.prepare(
      'SELECT id, username, full_name, email, role, phone, password_hash FROM login WHERE role = ?1 AND (LOWER(email) = LOWER(?2) OR LOWER(username) = LOWER(?2) OR phone = ?2) ORDER BY id DESC'
    ).bind('customer', loginId).first();

    if (!customer) return json({ success: false, error: 'Invalid credentials.' }, 401);

    const expected = String(customer.password_hash || '');
    const canonicalLoginId = customer.username || customer.email || customer.phone || loginId;
    const sha256Provided = await sha256Hex(password + canonicalLoginId.toLowerCase());
    const valid = expected.startsWith('$2')
      ? bcrypt.compareSync(password, expected)
      : expected === sha256Provided;
    if (!valid) return json({ success: false, error: 'Invalid credentials.' }, 401);

    const profile = await env.DB.prepare(
      'SELECT id, login_id, full_name, phone, email FROM customers WHERE login_id = ?1'
    ).bind(customer.id).first();

    return json({
      success: true,
      customer: {
        id: String(profile?.id || customer.id),
        _id: String(profile?.id || customer.id),
        login_id: String(customer.id),
        name: profile?.full_name || customer.full_name || '',
        full_name: profile?.full_name || customer.full_name || '',
        phone: profile?.phone || customer.phone || '',
        email: profile?.email || customer.email || '',
      },
    });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
