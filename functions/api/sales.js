// client/functions/api/sales.js
// ─── Cloudflare Pages Function: POS Sales (Orders) D1 Management ──────────────

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

async function ensureSalesTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS sales (
      id                          TEXT PRIMARY KEY,
      items                       TEXT NOT NULL,
      subtotal                    REAL NOT NULL,
      discount                    REAL NOT NULL,
      tax                         REAL NOT NULL,
      total                       REAL NOT NULL,
      date                        TEXT NOT NULL,
      cashier                     TEXT NOT NULL,
      customerId                  TEXT,
      paymentMode                 TEXT DEFAULT 'Cash',
      customerName                TEXT,
      customerAddress             TEXT,
      customerPan                 TEXT,
      customerAlternativeAddress  TEXT,
      customerAlternativePhone    TEXT,
      created_at                  TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const tableInfo = await db.prepare('PRAGMA table_info(sales)').all();
  const columns = new Set((tableInfo?.results ?? []).map((c) => c.name));
  if (!columns.has('customerName')) {
    await db.prepare("ALTER TABLE sales ADD COLUMN customerName TEXT").run();
  }
  if (!columns.has('customerAddress')) {
    await db.prepare("ALTER TABLE sales ADD COLUMN customerAddress TEXT").run();
  }
  if (!columns.has('customerPan')) {
    await db.prepare("ALTER TABLE sales ADD COLUMN customerPan TEXT").run();
  }
  if (!columns.has('customerAlternativeAddress')) {
    await db.prepare("ALTER TABLE sales ADD COLUMN customerAlternativeAddress TEXT").run();
  }
  if (!columns.has('customerAlternativePhone')) {
    await db.prepare("ALTER TABLE sales ADD COLUMN customerAlternativePhone TEXT").run();
  }
  if (!columns.has('customerEmail')) {
    await db.prepare('ALTER TABLE sales ADD COLUMN customerEmail TEXT').run();
  }
  if (!columns.has('customerPhone')) {
    await db.prepare('ALTER TABLE sales ADD COLUMN customerPhone TEXT').run();
  }
  if (!columns.has('customerLoginId')) {
    await db.prepare('ALTER TABLE sales ADD COLUMN customerLoginId TEXT').run();
  }
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

// GET /api/sales
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  try {
    await ensureSalesTable(env.DB);
    const { results } = await env.DB.prepare('SELECT * FROM sales ORDER BY created_at DESC').all();
    
    // Map items column back to JS Array
    const sales = results.map(s => ({
      ...s,
      items: JSON.parse(s.items)
    }));

    return json({ success: true, sales });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

// POST /api/sales
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400);
  }

  const { 
    id, items, subtotal, discount, tax, total, date, cashier, customerId, paymentMode,
    customerName, customerPhone, customerEmail, customerLoginId, customerAddress, customerPan,
    customerAlternativeAddress, customerAlternativePhone
  } = body;

  if (!id || !items || subtotal === undefined || total === undefined || !date || !cashier) {
    return json({ success: false, error: 'Required fields missing.' }, 400);
  }

  try {
    await ensureSalesTable(env.DB);
// Cloudflare Pages Function: POS Sales D1 Management

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

async function ensureSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      login_id INTEGER,
      warehouse_id INTEGER,
      bill_date DATE NOT NULL,
      miti TEXT,
      payment_mode TEXT DEFAULT 'Cash',
      gross_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      taxable_amount REAL DEFAULT 0,
      vat_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      tender_amount REAL DEFAULT 0,
      change_amount REAL DEFAULT 0,
      total_qty REAL DEFAULT 0,
      loyalty_point_earned REAL DEFAULT 0,
      loyalty_total_points REAL DEFAULT 0,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      hs_code TEXT,
      qty REAL NOT NULL,
      rate REAL NOT NULL,
      discount REAL DEFAULT 0,
      vat_percent REAL DEFAULT 13,
      vat_amount REAL DEFAULT 0,
      amount REAL NOT NULL,
      batch_no TEXT,
      expiry_date DATE,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
  `).run();
}

function toSaleResponse(saleRow, itemRows, customerRow, cashierRow) {
  return {
    id: saleRow.invoice_no,
    invoice_no: saleRow.invoice_no,
    customerId: saleRow.customer_id ? String(saleRow.customer_id) : '',
    customerName: customerRow?.full_name || 'Walk-in',
    customerPhone: customerRow?.phone || '',
    customerEmail: customerRow?.email || '',
    customerLoginId: customerRow?.login_id ? String(customerRow.login_id) : '',
    customerAddress: customerRow?.address || '',
    customerPan: customerRow?.pan_no || '',
    items: (itemRows || []).map((it) => ({
      productId: it.product_id,
      name: it.product_name,
      qty: Number(it.qty || 0),
      unit: '',
      rate: Number(it.rate || 0),
      total: Number(it.amount || 0),
      cost: 0,
    })),
    subtotal: Number(saleRow.taxable_amount || 0),
    discount: Number(saleRow.discount_amount || 0),
    tax: Number(saleRow.vat_amount || 0),
    total: Number(saleRow.net_amount || 0),
    amountPaid: Number(saleRow.paid_amount || 0),
    amountDue: Number(saleRow.due_amount || 0),
    date: saleRow.bill_date,
    cashier: cashierRow?.full_name || String(saleRow.login_id || ''),
    paymentMode: saleRow.payment_mode || 'Cash',
    status: 'completed',
    note: saleRow.note || '',
    created_at: saleRow.created_at,
  };
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  try {
    await ensureSchema(env.DB);
    const { results: saleRows } = await env.DB.prepare('SELECT * FROM sales ORDER BY created_at DESC').all();
    const sales = [];

    for (const saleRow of saleRows || []) {
      const { results: itemRows } = await env.DB.prepare('SELECT * FROM sale_items WHERE sale_id = ?1 ORDER BY id ASC').bind(saleRow.id).all();
      const customerRow = saleRow.customer_id
        ? await env.DB.prepare('SELECT id, full_name, phone, email, address, pan_no, login_id FROM customers WHERE id = ?1').bind(saleRow.customer_id).first()
        : null;
      const cashierRow = saleRow.login_id
        ? await env.DB.prepare('SELECT id, full_name FROM login WHERE id = ?1').bind(saleRow.login_id).first()
        : null;
      sales.push(toSaleResponse(saleRow, itemRows, customerRow, cashierRow));
    }

    return json({ success: true, sales });
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

  const {
    id,
    items,
    subtotal,
    discount,
    tax,
    total,
    amountPaid,
    amountDue,
    date,
    cashier,
    customerId,
    paymentMode,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    customerPan,
    note,
    warehouseId,
  } = body || {};

  if (!id || !items || total === undefined || !date || !cashier) {
    return json({ success: false, error: 'Required fields missing.' }, 400);
  }

  try {
    await ensureSchema(env.DB);
    const saleItems = Array.isArray(items) ? items : JSON.parse(typeof items === 'string' ? items : '[]');
    const billDate = String(date).slice(0, 10) || new Date().toISOString().slice(0, 10);

    let customerRow = null;
    if (customerId) {
      customerRow = await env.DB.prepare('SELECT id, full_name, phone, email, address, pan_no FROM customers WHERE id = ?1').bind(Number(customerId)).first();
    }
    if (!customerRow && customerName) {
      customerRow = await env.DB.prepare('SELECT id, full_name, phone, email, address, pan_no FROM customers WHERE LOWER(full_name) = LOWER(?1) ORDER BY id DESC').bind(String(customerName).trim()).first();
      if (!customerRow) {
        await env.DB.prepare('INSERT INTO customers (full_name, phone, email, address, pan_no, loyalty_points, opening_balance) VALUES (?1, ?2, ?3, ?4, ?5, 0, 0)').bind(
          String(customerName).trim(),
          String(customerPhone || '').trim() || null,
          String(customerEmail || '').trim() || null,
          String(customerAddress || '').trim() || null,
          String(customerPan || '').trim() || null,
        ).run();
        customerRow = await env.DB.prepare('SELECT id, full_name, phone, email, address, pan_no FROM customers WHERE LOWER(full_name) = LOWER(?1) ORDER BY id DESC').bind(String(customerName).trim()).first();
      }
    }

    const cashierRow = await env.DB.prepare('SELECT id, full_name FROM login WHERE LOWER(email) = LOWER(?1) OR LOWER(username) = LOWER(?1) OR LOWER(full_name) = LOWER(?1) ORDER BY id DESC').bind(String(cashier).trim()).first();

    const inserted = await env.DB.prepare(`
      INSERT INTO sales (
        invoice_no, customer_id, login_id, warehouse_id, bill_date, miti, payment_mode,
        gross_amount, discount_amount, taxable_amount, vat_amount, net_amount, paid_amount,
        due_amount, tender_amount, change_amount, total_qty, loyalty_point_earned,
        loyalty_total_points, note
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)
    `).bind(
      String(id).trim(),
      customerRow ? Number(customerRow.id) : null,
      cashierRow ? Number(cashierRow.id) : null,
      warehouseId ? Number(warehouseId) : 1,
      billDate,
      null,
      paymentMode || 'Cash',
      Number(subtotal || total || 0),
      Number(discount || 0),
      Number(subtotal || total || 0),
      Number(tax || 0),
      Number(total || 0),
      Number(amountPaid ?? total ?? 0),
      Number(amountDue ?? 0),
      Number(amountPaid ?? total ?? 0),
      Math.max(0, Number(amountPaid ?? total ?? 0) - Number(total || 0)),
      saleItems.reduce((sum, it) => sum + Number(it.qty || it.quantity || 0), 0),
      0,
      0,
      note || null,
    ).run();

    const saleRow = await env.DB.prepare('SELECT * FROM sales WHERE invoice_no = ?1').bind(String(id).trim()).first();
    for (const it of saleItems) {
      const productId = String(it.productId || it.id || it._id || it.product_id || it.product || '').trim();
      if (!productId) continue;
      const qty = Number(it.qty || it.quantity || 0);
      const rate = Number(it.rate || 0);
      const amount = Number(it.total || qty * rate);
      const product = await env.DB.prepare('SELECT id, name_en FROM products WHERE id = ?1').bind(productId).first();

      await env.DB.prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, hs_code, qty, rate, discount, vat_percent, vat_amount, amount, batch_no, expiry_date)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
      `).bind(
        Number(saleRow.id),
        productId,
        String(it.name || it.productName || product?.name_en || productId),
        it.hs_code || it.hsCode || null,
        qty,
        rate,
        Number(it.discount || 0),
        Number(it.vat_percent || it.vatPercent || 13),
        Number(it.vat_amount || it.vatAmount || 0),
        amount,
        it.batch_no || it.batchNo || null,
        it.expiry_date || it.expiryDate || null,
      ).run();
    }

    const { results: itemRows } = await env.DB.prepare('SELECT * FROM sale_items WHERE sale_id = ?1 ORDER BY id ASC').bind(Number(saleRow.id)).all();
    const sale = toSaleResponse(saleRow, itemRows, customerRow, cashierRow);
    return json({ success: true, sale });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
            await env.DB.prepare(`
