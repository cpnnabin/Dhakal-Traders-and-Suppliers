// client/functions/api/customers.js
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

  const tableInfo = await db.prepare('PRAGMA table_info(pos_customers)').all();
  const columns = new Set((tableInfo?.results ?? []).map((c) => c.name));
  for (const col of ['password', 'panNo', 'alternativeAddress', 'alternativePhone', 'login_id']) {
    if (!columns.has(col)) {
      await db.prepare(`ALTER TABLE pos_customers ADD COLUMN ${col} TEXT`).run();
    }
  }

  const fkList = await db.prepare('PRAGMA foreign_key_list(pos_customers)').all();
  const hasLoginFk = (fkList?.results ?? []).some((fk) => String(fk.table).toLowerCase() === 'login');
  if (hasLoginFk) {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS pos_customers_new (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        login_id           TEXT,
        name               TEXT NOT NULL,
        phone              TEXT NOT NULL,
        email              TEXT,
        address            TEXT,
        type               TEXT DEFAULT 'retail',
        password           TEXT,
        panNo              TEXT,
        alternativeAddress TEXT,
        alternativePhone   TEXT,
        created_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    await db.prepare(`
      INSERT INTO pos_customers_new (id, login_id, name, phone, email, address, type, password, panNo, alternativeAddress, alternativePhone, created_at)
      SELECT id, login_id, name, phone, email, address, type, password, panNo, alternativeAddress, alternativePhone, created_at
      FROM pos_customers
    `).run();

    await db.prepare('DROP TABLE pos_customers').run();
    await db.prepare('ALTER TABLE pos_customers_new RENAME TO pos_customers').run();
  }
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  try {
    await ensureCustomersTable(env.DB);
    const { results } = await env.DB.prepare('SELECT id, name, phone, email, login_id, address, type, password, panNo, alternativeAddress, alternativePhone FROM pos_customers ORDER BY name ASC').all();

    const customers = results.map((c) => ({
      _id: String(c.id),
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      login_id: c.login_id || '',
      address: c.address || '',
      type: c.type || 'retail',
      password: c.password || c.phone || '12345',
      panNo: c.panNo || '',
      alternativeAddress: c.alternativeAddress || '',
      alternativePhone: c.alternativePhone || '',
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

  const { _id, name, phone, email, login_id, address, type, password, panNo, alternativeAddress, alternativePhone } = body;

  try {
    await ensureCustomersTable(env.DB);

    if (_id) {
      const customerId = parseInt(_id, 10);
      const existing = await env.DB.prepare('SELECT id FROM pos_customers WHERE id = ?1').bind(customerId).first();
      if (!existing) return json({ success: false, error: 'Customer not found.' }, 404);

      let query = 'UPDATE pos_customers SET ';
      const params = [];
      const updates = [];

      if (name !== undefined) { updates.push('name = ?' + (params.length + 1)); params.push(name.trim()); }
      if (phone !== undefined) { updates.push('phone = ?' + (params.length + 1)); params.push(phone.trim()); }
      if (email !== undefined) { updates.push('email = ?' + (params.length + 1)); params.push(email.trim()); }
      if (body.productToBuy !== undefined) { updates.push('productToBuy = ?' + (params.length + 1)); params.push((body.productToBuy || '').trim()); }
      if (login_id !== undefined) { updates.push('login_id = ?' + (params.length + 1)); params.push(login_id.trim()); }
      if (address !== undefined) { updates.push('address = ?' + (params.length + 1)); params.push(address.trim()); }
      if (type !== undefined) { updates.push('type = ?' + (params.length + 1)); params.push(type); }
      if (password !== undefined) { updates.push('password = ?' + (params.length + 1)); params.push(password.trim()); }
      if (panNo !== undefined) { updates.push('panNo = ?' + (params.length + 1)); params.push(panNo.trim()); }
      if (alternativeAddress !== undefined) { updates.push('alternativeAddress = ?' + (params.length + 1)); params.push(alternativeAddress.trim()); }
      if (alternativePhone !== undefined) { updates.push('alternativePhone = ?' + (params.length + 1)); params.push(alternativePhone.trim()); }

      if (updates.length === 0) return json({ success: true });

      query += updates.join(', ') + ' WHERE id = ?' + (params.length + 1);
      params.push(customerId);
      await env.DB.prepare(query).bind(...params).run();

      const updated = await env.DB.prepare('SELECT id, name, phone, email, login_id, address, productToBuy, type, password, panNo, alternativeAddress, alternativePhone FROM pos_customers WHERE id = ?1').bind(customerId).first();
      return json({
        success: true,
        customer: {
          _id: String(updated.id),
          name: updated.name,
          phone: updated.phone,
          email: updated.email || '',
          login_id: updated.login_id || '',
          address: updated.address || '',
          productToBuy: updated.productToBuy || '',
          type: updated.type || 'retail',
          password: updated.password || updated.phone || '12345',
          panNo: updated.panNo || '',
          alternativeAddress: updated.alternativeAddress || '',
          alternativePhone: updated.alternativePhone || '',
        }
      });
    }

    if (!name || !phone) {
      return json({ success: false, error: 'Name and phone number are required.' }, 400);
    }

    const passVal = (password || phone).trim();

    await env.DB.prepare(
      'INSERT INTO pos_customers (name, phone, email, login_id, address, productToBuy, type, password, panNo, alternativeAddress, alternativePhone) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)'
    ).bind(
      name.trim(),
      phone.trim(),
      (email || '').trim(),
      (login_id || '').trim(),
      (address || '').trim(),
      (body.productToBuy || '').trim(),
      type || 'retail',
      passVal,
      (panNo || '').trim(),
      (alternativeAddress || '').trim(),
      (alternativePhone || '').trim()
    ).run();

    const created = await env.DB.prepare('SELECT id, name, phone, email, login_id, address, productToBuy, type, password, panNo, alternativeAddress, alternativePhone FROM pos_customers WHERE name = ?1 AND phone = ?2 ORDER BY id DESC').bind(name.trim(), phone.trim()).first();
    return json({
      success: true,
      customer: {
        _id: String(created.id),
        name: created.name,
        phone: created.phone,
        email: created.email || '',
        login_id: created.login_id || '',
        address: created.address || '',
        productToBuy: created.productToBuy || '',
        type: created.type || 'retail',
        password: created.password || created.phone || '12345',
        panNo: created.panNo || '',
        alternativeAddress: created.alternativeAddress || '',
        alternativePhone: created.alternativePhone || '',
      }
    });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
