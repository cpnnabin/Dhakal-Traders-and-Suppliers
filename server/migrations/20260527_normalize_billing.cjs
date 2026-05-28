// Migration: Normalize billing schema — create invoices, invoice_items, payments, stock_movements, journal_vouchers, journal_entries
// and migrate existing sales/sale_items into invoices/invoice_items when safe.

/**
 * Idempotent migration: safe to run on existing DBs. Keeps original `sales` and `sale_items` untouched.
 */
module.exports.up = async function(knex) {
  // create invoices table
  if (!(await knex.schema.hasTable('invoices'))) {
    await knex.schema.createTable('invoices', table => {
      table.increments('id').primary();
      table.string('invoice_no').unique().notNullable();
      table.integer('customer_id');
      table.integer('login_id');
      table.integer('warehouse_id');
      table.date('bill_date').notNullable();
      table.string('miti');
      table.string('payment_mode').defaultTo('Cash');
      table.decimal('gross_amount', 14, 2).defaultTo(0);
      table.decimal('discount_amount', 14, 2).defaultTo(0);
      table.decimal('taxable_amount', 14, 2).defaultTo(0);
      table.decimal('vat_amount', 14, 2).defaultTo(0);
      table.decimal('net_amount', 14, 2).defaultTo(0);
      table.decimal('paid_amount', 14, 2).defaultTo(0);
      table.decimal('due_amount', 14, 2).defaultTo(0);
      table.decimal('tender_amount', 14, 2).defaultTo(0);
      table.decimal('change_amount', 14, 2).defaultTo(0);
      table.decimal('total_qty', 14, 2).defaultTo(0);
      table.integer('loyalty_point_earned').defaultTo(0);
      table.integer('loyalty_total_points').defaultTo(0);
      table.text('note');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // create invoice_items table
  if (!(await knex.schema.hasTable('invoice_items'))) {
    await knex.schema.createTable('invoice_items', table => {
      table.increments('id').primary();
      table.integer('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
      table.string('product_id').notNullable();
      table.string('product_name').notNullable();
      table.string('hs_code');
      table.decimal('qty', 14, 3).notNullable();
      table.decimal('rate', 14, 2).notNullable();
      table.decimal('discount', 14, 2).defaultTo(0);
      table.decimal('vat_percent', 5, 2).defaultTo(13);
      table.decimal('vat_amount', 14, 2).defaultTo(0);
      table.decimal('amount', 14, 2).notNullable();
      table.string('batch_no');
      table.date('expiry_date');
    });
  }

  // ensure payments table exists
  if (!(await knex.schema.hasTable('payments'))) {
    await knex.schema.createTable('payments', table => {
      table.increments('id').primary();
      table.integer('invoice_id').references('id').inTable('invoices').onDelete('CASCADE');
      table.string('payment_method').notNullable();
      table.decimal('paid_amount', 14, 2).notNullable();
      table.decimal('tender_amount', 14, 2).defaultTo(0);
      table.decimal('return_amount', 14, 2).defaultTo(0);
      table.string('transaction_no');
      table.timestamp('payment_date').defaultTo(knex.fn.now());
    });
  }

  // ensure stock_movements exists
  if (!(await knex.schema.hasTable('stock_movements'))) {
    await knex.schema.createTable('stock_movements', table => {
      table.increments('id').primary();
      table.string('product_id').notNullable();
      table.string('movement_type').notNullable(); // purchase, sale, sales_return, purchase_return, adjustment
      table.integer('reference_id');
      table.decimal('qty_in', 14, 3).defaultTo(0);
      table.decimal('qty_out', 14, 3).defaultTo(0);
      table.decimal('balance_qty', 14, 3).defaultTo(0);
      table.timestamp('movement_date').defaultTo(knex.fn.now());
    });
  }

  // ensure journal_vouchers + journal_entries exist
  if (!(await knex.schema.hasTable('journal_vouchers'))) {
    await knex.schema.createTable('journal_vouchers', table => {
      table.increments('id').primary();
      table.string('voucher_no').unique().notNullable();
      table.date('voucher_date').notNullable();
      table.text('narration');
      table.string('reference_no');
      table.integer('login_id');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('journal_entries'))) {
    await knex.schema.createTable('journal_entries', table => {
      table.increments('id').primary();
      table.integer('voucher_id').notNullable().references('id').inTable('journal_vouchers').onDelete('CASCADE');
      table.integer('account_id').notNullable();
      table.decimal('debit', 14, 2).defaultTo(0);
      table.decimal('credit', 14, 2).defaultTo(0);
      table.text('description');
    });
  }

  // Data migration: if invoices empty but sales exist, copy sales -> invoices and sale_items -> invoice_items
  const hasSales = await knex.schema.hasTable('sales');
  if (hasSales) {
    const [{ cnt }] = await knex('invoices').count('id as cnt');
    if (Number(cnt) === 0) {
      // migrate inside a transaction
      await knex.transaction(async trx => {
        const sales = await trx.select('*').from('sales').orderBy('id', 'asc');
        for (const s of sales) {
          // insert invoice record preserving invoice_no if present
          const invoiceNo = (s.invoice_no || s.id || s.invoiceNo || '').toString();
          const insert = {
            invoice_no: invoiceNo || `INV-${Date.now().toString().slice(-8)}`,
            customer_id: s.customer_id || s.customerId || null,
            login_id: s.login_id || s.loginId || null,
            warehouse_id: s.warehouse_id || s.warehouseId || null,
            bill_date: s.bill_date || (s.date ? s.date.toString().slice(0,10) : null) || knex.fn.now(),
            miti: s.miti || null,
            payment_mode: s.payment_mode || s.paymentMode || 'Cash',
            gross_amount: s.gross_amount || s.grossAmount || s.subtotal || 0,
            discount_amount: s.discount_amount || s.discount || 0,
            taxable_amount: s.taxable_amount || s.taxableAmount || s.subtotal || 0,
            vat_amount: s.vat_amount || s.vatAmount || s.tax || 0,
            net_amount: s.net_amount || s.netAmount || s.total || 0,
            paid_amount: s.paid_amount || s.paidAmount || s.amountPaid || 0,
            due_amount: s.due_amount || s.amountDue || s.due || 0,
            tender_amount: s.tender_amount || 0,
            change_amount: s.change_amount || 0,
            total_qty: s.total_qty || s.totalQty || 0,
            loyalty_point_earned: s.loyalty_point_earned || 0,
            loyalty_total_points: s.loyalty_total_points || 0,
            note: s.note || s.noteText || null,
            created_at: s.created_at || s.createdAt || knex.fn.now(),
          };
          await trx('invoices').insert(insert);

          // migrate items for this sale
          const saleId = s.id;
          if (await trx.schema.hasTable('sale_items')) {
            const items = await trx.select('*').from('sale_items').where('sale_id', saleId).orderBy('id', 'asc');
            if (items && items.length) {
              // find inserted invoice id
              const inv = await trx('invoices').where('invoice_no', insert.invoice_no).first();
              for (const it of items) {
                await trx('invoice_items').insert({
                  invoice_id: inv.id,
                  product_id: it.product_id || it.productId || it.product || '',
                  product_name: it.product_name || it.productName || it.name || '',
                  hs_code: it.hs_code || it.hsCode || null,
                  qty: it.qty || it.quantity || 0,
                  rate: it.rate || it.price || 0,
                  discount: it.discount || 0,
                  vat_percent: it.vat_percent || it.vatPercent || 13,
                  vat_amount: it.vat_amount || it.vatAmount || 0,
                  amount: it.amount || it.total || 0,
                  batch_no: it.batch_no || it.batchNo || null,
                  expiry_date: it.expiry_date || it.expiryDate || null,
                });
                // also create a stock_movement record for sale (qty_out)
                await trx('stock_movements').insert({
                  product_id: it.product_id || it.productId || it.product || '',
                  movement_type: 'sale',
                  reference_id: inv.id,
                  qty_in: 0,
                  qty_out: it.qty || it.quantity || 0,
                  balance_qty: 0,
                });
              }
            }
          }
        }
      });
    }
  }
};

module.exports.down = async function(knex) {
  // keep down simple: do not drop data by default — migrations are intended to be forward-only for safety
  // If explicit rollback required, implement carefully.
  return Promise.resolve();
};
