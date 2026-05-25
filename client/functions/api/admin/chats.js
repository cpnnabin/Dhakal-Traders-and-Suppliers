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
    const [chatRes, customerRes] = await Promise.all([
      env.DB.prepare('SELECT * FROM chats ORDER BY timestamp DESC LIMIT 200').all(),
      env.DB.prepare('SELECT id, name, login_id, phone, email FROM pos_customers ORDER BY name ASC').all(),
    ]);

    const chats = chatRes.results || [];
    const customers = customerRes.results || [];

    const lookup = new Map();
    customers.forEach((c) => {
      lookup.set(String(c.id), c);
      if (c.login_id) lookup.set(String(c.login_id), c);
      if (c.phone) lookup.set(String(c.phone), c);
      if (c.email) lookup.set(String(c.email).toLowerCase(), c);
    });

    const grouped = chats.reduce((acc, chat) => {
      const key = String(chat.customerId);
      const customer = lookup.get(key) || lookup.get(key.toLowerCase());
      const customerName = customer?.name || `Customer ${chat.customerId}`;
      if (!acc[key]) acc[key] = { customerId: chat.customerId, customerName, messages: [] };
      acc[key].messages.push(chat);
      return acc;
    }, {});

    Object.values(grouped).forEach((g) => g.messages.reverse());
    return json({ success: true, chats: Object.values(grouped) });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
