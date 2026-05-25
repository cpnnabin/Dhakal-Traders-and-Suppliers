// functions/api/health.js
// Lightweight health endpoint for Cloudflare Pages Functions
// GET /api/health -> { success: true, status: { pos_jwt_secret, db_bound, db_ok } }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-pos-token',
  'cache-control': 'no-store',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ env }) {
  const status = {
    pos_jwt_secret: !!env.POS_JWT_SECRET,
    db_bound: !!env.DB,
  };

  if (env.DB) {
    try {
      // quick D1 smoke check
      const res = await env.DB.prepare('SELECT 1 as ok').first();
      status.db_ok = !!res && res.ok === 1;
    } catch (err) {
      try { console.error('Health D1 check failed:', err); } catch (e) {}
      status.db_ok = false;
      status.db_error = err?.message || String(err);
    }
  }

  return json({ success: true, status });
}
