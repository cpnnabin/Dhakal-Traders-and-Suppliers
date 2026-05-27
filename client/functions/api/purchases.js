// client/functions/api/purchases.js
// ─── Cloudflare Pages Function: POS Purchases D1 Management ──────────────────

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
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_no TEXT UNIQUE NOT NULL,
      supplier_id INTEGER,
      login_id INTEGER,
      warehouse_id INTEGER,
      purchase_date DATE NOT NULL,
      payment_mode TEXT DEFAULT 'Cash',
      gross_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      taxable_amount REAL DEFAULT 0,
      vat_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      qty REAL NOT NULL,
      rate REAL NOT NULL,
      discount REAL DEFAULT 0,
      vat_percent REAL DEFAULT 13,
      vat_amount REAL DEFAULT 0,
      amount REAL NOT NULL,
      batch_no TEXT,
      expiry_date DATE,
      FOREIGN KEY(purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
    )
  `).run();
}

function toPurchaseResponse(purchaseRow, itemRows, supplierRow) {
  return {
    id: purchaseRow.bill_no,
    bill_no: purchaseRow.bill_no,
    supplierId: purchaseRow.supplier_id ? String(purchaseRow.supplier_id) : '',
    farmerName: supplierRow?.supplier_name || 'Supplier',
    productName: itemRows?.[0]?.product_name || '',
    qtyKg: Number(itemRows?.reduce((sum, row) => sum + Number(row.qty || 0), 0) || 0),
    rate: Number(itemRows?.[0]?.rate || 0),
    total: Number(purchaseRow.net_amount || 0),
    date: purchaseRow.purchase_date,
    paymentMode: purchaseRow.payment_mode || 'Cash',
    items: (itemRows || []).map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      qtyKg: Number(row.qty || 0),
      rate: Number(row.rate || 0),
      total: Number(row.amount || 0),
    })),
    note: purchaseRow.note || '',
    created_at: purchaseRow.created_at,
  };
}

export const onRequestOptions = async () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  try {
    await ensureSchema(env.DB);
    const { results: purchaseRows } = await env.DB.prepare('SELECT * FROM purchases ORDER BY created_at DESC').all();
    const purchases = [];

    for (const purchaseRow of purchaseRows || []) {
      const { results: itemRows } = await env.DB.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?1 ORDER BY id ASC').bind(purchaseRow.id).all();
      const supplierRow = purchaseRow.supplier_id
        ? await env.DB.prepare('SELECT id, supplier_name, phone, email, address, pan_no FROM suppliers WHERE id = ?1').bind(purchaseRow.supplier_id).first()
        : null;
      purchases.push(toPurchaseResponse(purchaseRow, itemRows, supplierRow));
    }

    return json({ success: true, purchases });
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
    farmerName,
    supplierName,
    productName,
    qtyKg,
    rate,
    total,
    date,
    paymentMode,
    items,
    note,
    warehouseId,
  } = body || {};

  if (!id || !date) {
    return json({ success: false, error: 'Purchase id and date are required.' }, 400);
  }

  try {
    await ensureSchema(env.DB);

    const purchaseItems = Array.isArray(items) && items.length > 0
      ? items
      : [{ productName: productName || 'Item', qtyKg: qtyKg || 0, rate: rate || 0, total: total || 0 }];

    const supplierLabel = String(supplierName || farmerName || '').trim();
    let supplierRow = null;
    if (supplierLabel) {
      supplierRow = await env.DB.prepare('SELECT id, supplier_name, phone, email, address, pan_no FROM suppliers WHERE LOWER(supplier_name) = LOWER(?1) ORDER BY id DESC').bind(supplierLabel).first();
      if (!supplierRow) {
        await env.DB.prepare('INSERT INTO suppliers (supplier_name, phone, email, address, pan_no, opening_balance, login_id) VALUES (?1, NULL, NULL, NULL, NULL, 0, NULL)').bind(supplierLabel).run();
        supplierRow = await env.DB.prepare('SELECT id, supplier_name, phone, email, address, pan_no FROM suppliers WHERE LOWER(supplier_name) = LOWER(?1) ORDER BY id DESC').bind(supplierLabel).first();
      }
    }

    const purchaseDate = String(date).slice(0, 10) || new Date().toISOString().slice(0, 10);
    const purchaseTotal = Number(total || 0);
    const inserted = await env.DB.prepare(`
      INSERT INTO purchases (
        bill_no, supplier_id, login_id, warehouse_id, purchase_date, payment_mode,
        gross_amount, discount_amount, taxable_amount, vat_amount, net_amount, paid_amount,
        due_amount, note
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, 0, ?9, ?10, 0, ?11)
    `).bind(
      String(id).trim(),
      supplierRow ? Number(supplierRow.id) : null,
      null,
      warehouseId ? Number(warehouseId) : 1,
      purchaseDate,
      paymentMode || 'Cash',
      purchaseTotal,
      purchaseTotal,
      purchaseTotal,
      purchaseTotal,
      note || null,
    ).run();

    const purchaseRow = await env.DB.prepare('SELECT * FROM purchases WHERE bill_no = ?1').bind(String(id).trim()).first();

    for (const it of purchaseItems) {
      const productNameValue = String(it.productName || it.product_name || 'Item').trim();
      const qty = Number(it.qtyKg || it.qty || it.quantity || 0);
      const rateValue = Number(it.rate || 0);
      const amount = Number(it.total || qty * rateValue);
      let product = await env.DB.prepare('SELECT id, name_en FROM products WHERE LOWER(name_en) = LOWER(?1) ORDER BY id DESC').bind(productNameValue).first();
      if (!product) {
        const productId = `PRD-${Date.now().toString().slice(-6)}`;
        await env.DB.prepare('INSERT INTO products (id, barcode, name_en, name_ne, category_id, brand_id, unit_id, purchase_price, selling_price, tax_percent, min_stock, image, expiry_date, status, login_id) VALUES (?1, NULL, ?2, NULL, NULL, NULL, NULL, ?3, ?4, 13, 0, NULL, NULL, "active", NULL)').bind(productId, productNameValue, rateValue, rateValue).run();
        product = await env.DB.prepare('SELECT id, name_en FROM products WHERE id = ?1').bind(productId).first();
      }

      await env.DB.prepare(`
        INSERT INTO purchase_items (purchase_id, product_id, product_name, qty, rate, discount, vat_percent, vat_amount, amount, batch_no, expiry_date)
        VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, 0, ?7, ?8, ?9)
      `).bind(
        Number(purchaseRow.id),
        product.id,
        String(it.productName || it.product_name || product?.name_en || productNameValue),
        qty,
        rateValue,
        Number(it.vat_percent || it.vatPercent || 13),
        amount,
        it.batch_no || it.batchNo || null,
        it.expiry_date || it.expiryDate || null,
      ).run();
    }

    const { results: itemRows } = await env.DB.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?1 ORDER BY id ASC').bind(Number(purchaseRow.id)).all();
    const purchase = toPurchaseResponse(purchaseRow, itemRows, supplierRow);

    return json({ success: true, purchase });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
