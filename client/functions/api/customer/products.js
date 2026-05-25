const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-pos-token',
  'cache-control': 'no-store',
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
});

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);
  try {
    const { results } = await env.DB.prepare(`
      SELECT id, nameEn, nameNe, category, sellingPrice, unit, emoji
      FROM products
      WHERE status = 'active' AND stock > 0
      ORDER BY nameEn ASC
    `).all();

    return json({ success: true, products: results || [] });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
