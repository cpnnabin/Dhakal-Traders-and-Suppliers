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

async function ensureChatsTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId TEXT NOT NULL,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  try {
    await ensureChatsTable(env.DB);
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const pathCustomerId = pathParts.length >= 3 ? pathParts[pathParts.length - 1] : '';
    const customerId = url.searchParams.get('customerId') || pathCustomerId;

    if (customerId) {
      const { results } = await env.DB.prepare('SELECT * FROM chats WHERE customerId = ?1 ORDER BY timestamp ASC').bind(String(customerId)).all();
      return json({ success: true, chats: results || [] });
    }

    const { results } = await env.DB.prepare('SELECT * FROM chats ORDER BY timestamp DESC LIMIT 200').all();
    return json({ success: true, chats: results || [] });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON body.' }, 400); }

  const customerId = String(body.customerId || '').trim();
  const sender = String(body.sender || '').trim();
  const message = String(body.message || '').trim();
  if (!customerId || !sender || !message) return json({ success: false, error: 'CustomerId, sender and message are required.' }, 400);

  try {
    await ensureChatsTable(env.DB);
    await env.DB.prepare('INSERT INTO chats (customerId, sender, message) VALUES (?1, ?2, ?3)').bind(customerId, sender, message).run();
    const chat = await env.DB.prepare('SELECT * FROM chats WHERE customerId = ?1 ORDER BY timestamp DESC LIMIT 1').bind(customerId).first();
    return json({ success: true, chat });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
