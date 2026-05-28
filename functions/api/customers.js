// functions/api/customers.js
// ─── Cloudflare Pages Function: POS Customers Management ──────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-pos-token',
  'cache-control': 'no-store',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });

async function ensureCustomersTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS customers (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      login_id           INTEGER,
      full_name          TEXT NOT NULL,
      phone              TEXT NOT NULL,
      email              TEXT,
      address            TEXT,
      pan_no             TEXT,
      loyalty_points     REAL DEFAULT 0,
      opening_balance    REAL DEFAULT 0,
      created_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const tableInfo = await db.prepare('PRAGMA table_info(customers)').all();
  const columns = new Set((tableInfo?.results ?? []).map((c) => c.name));
  for (const col of ['full_name', 'pan_no', 'loyalty_points', 'opening_balance', 'login_id']) {
    if (!columns.has(col)) {
      await db.prepare(`ALTER TABLE customers ADD COLUMN ${col} TEXT`).run();
    }
  }

  const fkList = await db.prepare('PRAGMA foreign_key_list(customers)').all();
  const hasLoginFk = (fkList?.results ?? []).some((fk) => String(fk.table).toLowerCase() === 'login');
  if (hasLoginFk) {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS customers_new (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        login_id           INTEGER,
        full_name          TEXT NOT NULL,
        phone              TEXT NOT NULL,
        email              TEXT,
        address            TEXT,
        pan_no             TEXT,
        loyalty_points     REAL DEFAULT 0,
        opening_balance    REAL DEFAULT 0,
        created_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    await db.prepare(`
      INSERT INTO customers_new (id, login_id, full_name, phone, email, address, pan_no, loyalty_points, opening_balance, created_at)
      SELECT id, login_id, COALESCE(full_name, name), phone, email, address, COALESCE(pan_no, panNo), COALESCE(loyalty_points, 0), COALESCE(opening_balance, 0), created_at
      FROM customers
    `).run();

    await db.prepare('DROP TABLE customers').run();
    await db.prepare('ALTER TABLE customers_new RENAME TO customers').run();
  }
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  try {
    await ensureCustomersTable(env.DB);
    const requestUrl = request?.url ? new URL(request.url) : null;
    const search = String(requestUrl?.searchParams.get('search') || '').trim();
    const limit = Math.max(1, Math.min(100, Number(requestUrl?.searchParams.get('limit') || 50)));

    let query = 'SELECT id, full_name, phone, email, login_id, address, pan_no, loyalty_points, opening_balance FROM customers';
    const binds = [];
    if (search) {
      const like = `%${search.toLowerCase()}%`;
      query += ` WHERE LOWER(CAST(id AS TEXT)) LIKE ?1 OR LOWER(full_name) LIKE ?1 OR LOWER(phone) LIKE ?1 OR LOWER(IFNULL(email, '')) LIKE ?1 OR LOWER(IFNULL(address, '')) LIKE ?1 OR LOWER(IFNULL(pan_no, '')) LIKE ?1 OR LOWER(CAST(IFNULL(login_id, '') AS TEXT)) LIKE ?1`;
      binds.push(like);
    }
    query += ' ORDER BY full_name ASC LIMIT ' + (search ? '?2' : '?1');

    const stmt = search
      ? env.DB.prepare(query).bind(binds[0], limit)
      : env.DB.prepare(query).bind(limit);

    const { results } = await stmt.all();

    const customers = results.map((c) => ({
      _id: String(c.id),
      id: String(c.id),
      name: c.full_name,
      full_name: c.full_name,
      phone: c.phone,
      email: c.email || '',
      login_id: c.login_id ? String(c.login_id) : '',
      address: c.address || '',
      panNo: c.pan_no || '',
      pan_no: c.pan_no || '',
      loyalty_points: Number(c.loyalty_points || 0),
      opening_balance: Number(c.opening_balance || 0),
    }));

    return json({ success: true, customers });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400);
  }

  const { _id, id, name, full_name, phone, email, login_id, address, panNo, pan_no, loyalty_points, opening_balance } = body;
  const customerName = String(full_name || name || '').trim();
  const customerPan = String(pan_no || panNo || '').trim() || null;

  try {
    await ensureCustomersTable(env.DB);

    if (_id || id) {
      const customerId = parseInt(_id || id, 10);
      const existing = await env.DB.prepare('SELECT id FROM customers WHERE id = ?1').bind(customerId).first();
      if (!existing) return json({ success: false, error: 'Customer not found.' }, 404);

      let query = 'UPDATE customers SET ';
      const params = [];
      const updates = [];

      if (name !== undefined || full_name !== undefined) { updates.push('full_name = ?' + (params.length + 1)); params.push((customerName || '').trim()); }
      if (phone !== undefined) { updates.push('phone = ?' + (params.length + 1)); params.push(phone.trim()); }
      if (email !== undefined) { updates.push('email = ?' + (params.length + 1)); params.push(email.trim()); }
      if (login_id !== undefined) { updates.push('login_id = ?' + (params.length + 1)); params.push(login_id === null || login_id === '' ? null : String(login_id).trim()); }
      if (address !== undefined) { updates.push('address = ?' + (params.length + 1)); params.push(address.trim()); }
      if (panNo !== undefined || pan_no !== undefined) { updates.push('pan_no = ?' + (params.length + 1)); params.push(customerPan); }
      if (loyalty_points !== undefined) { updates.push('loyalty_points = ?' + (params.length + 1)); params.push(Number(loyalty_points || 0)); }
      if (opening_balance !== undefined) { updates.push('opening_balance = ?' + (params.length + 1)); params.push(Number(opening_balance || 0)); }

      if (updates.length === 0) return json({ success: true });

      query += updates.join(', ') + ' WHERE id = ?' + (params.length + 1);
      params.push(customerId);
      await env.DB.prepare(query).bind(...params).run();

      const updated = await env.DB.prepare('SELECT id, full_name, phone, email, login_id, address, pan_no, loyalty_points, opening_balance FROM customers WHERE id = ?1').bind(customerId).first();
      return json({
        success: true,
        customer: {
          _id: String(updated.id),
          id: String(updated.id),
          name: updated.full_name,
          full_name: updated.full_name,
          phone: updated.phone,
          email: updated.email || '',
          login_id: updated.login_id ? String(updated.login_id) : '',
          address: updated.address || '',
          panNo: updated.pan_no || '',
          pan_no: updated.pan_no || '',
          loyalty_points: Number(updated.loyalty_points || 0),
          opening_balance: Number(updated.opening_balance || 0),
        }
      });
    }

    if (!customerName || !phone) {
      return json({ success: false, error: 'Name and phone number are required.' }, 400);
    }

    await env.DB.prepare(
        'INSERT INTO customers (full_name, phone, email, login_id, address, pan_no, loyalty_points, opening_balance) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)'
    ).bind(
      customerName,
      phone.trim(),
      (email || '').trim(),
      (login_id || null),
      (address || '').trim(),
      customerPan,
      Number(loyalty_points || 0),
      Number(opening_balance || 0)
    ).run();

    const created = await env.DB.prepare('SELECT id, full_name, phone, email, login_id, address, pan_no, loyalty_points, opening_balance FROM customers WHERE full_name = ?1 AND phone = ?2 ORDER BY id DESC').bind(customerName, phone.trim()).first();
    return json({
      success: true,
      customer: {
        _id: String(created.id),
        id: String(created.id),
        name: created.full_name,
        full_name: created.full_name,
        phone: created.phone,
        email: created.email || '',
        login_id: created.login_id ? String(created.login_id) : '',
        address: created.address || '',
        panNo: created.pan_no || '',
        pan_no: created.pan_no || '',
        loyalty_points: Number(created.loyalty_points || 0),
        opening_balance: Number(created.opening_balance || 0),
      }
    });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
