export async function up(knex) {
  // admins
  const hasAdmins = await knex.schema.hasTable('admins');
  if (!hasAdmins) {
    await knex.schema.createTable('admins', (t) => {
      t.increments('id').primary();
      t.string('email').unique().notNullable();
      t.string('password').notNullable();
      t.string('created_at').notNullable();
    });
  }

  // login table
  const hasLogin = await knex.schema.hasTable('login');
  if (!hasLogin) {
    await knex.schema.createTable('login', (t) => {
      t.increments('id').primary();
      t.string('email').unique().notNullable();
      t.string('display_name').notNullable().defaultTo('Cashier');
      t.string('role').notNullable().defaultTo('cashier');
      t.string('phone');
      t.string('password_hash').notNullable();
      t.string('address');
      t.string('alternative_phone');
      t.string('bio');
      t.string('avatar');
      t.string('pan_no');
      t.string('profile_photo');
    });
  }

  // products
  const hasProducts = await knex.schema.hasTable('products');
  if (!hasProducts) {
    await knex.schema.createTable('products', (t) => {
      t.string('id').primary();
      t.string('nameEn').notNullable();
      t.string('nameNe').notNullable().defaultTo('');
      t.string('category').notNullable().defaultTo('');
      t.decimal('stock', 14, 3).notNullable().defaultTo(0);
      t.string('unit').notNullable().defaultTo('pcs');
      t.decimal('purchasePrice', 14, 2).notNullable().defaultTo(0);
      t.decimal('sellingPrice', 14, 2).notNullable().defaultTo(0);
      t.string('emoji').defaultTo('📦');
      t.string('status').defaultTo('active');
      t.decimal('minStock', 14, 3).defaultTo(0);
    });
  }

  // sales
  const hasSales = await knex.schema.hasTable('sales');
  if (!hasSales) {
    await knex.schema.createTable('sales', (t) => {
      t.string('id').primary();
      t.text('items').notNullable();
      t.string('customerName');
      t.string('customerPhone');
      t.string('customerEmail');
      t.decimal('subtotal', 14, 2).notNullable().defaultTo(0);
      t.decimal('discount', 14, 2).notNullable().defaultTo(0);
      t.decimal('tax', 14, 2).notNullable().defaultTo(0);
      t.decimal('total', 14, 2).notNullable().defaultTo(0);
      t.string('date').notNullable();
      t.string('cashier').notNullable();
      t.string('customerId');
      t.string('paymentMode').defaultTo('Cash');
      t.string('created_at').defaultTo(knex.fn.now());
    });
  }

  // purchases
  const hasPurchases = await knex.schema.hasTable('purchases');
  if (!hasPurchases) {
    await knex.schema.createTable('purchases', (t) => {
      t.string('id').primary();
      t.string('supplier').notNullable();
      t.text('items').notNullable();
      t.decimal('total', 14, 2).notNullable().defaultTo(0);
      t.string('date').notNullable();
      t.string('paymentMode').defaultTo('Cash');
      t.string('created_at').defaultTo(knex.fn.now());
    });
  }

  // customers
  const hasCustomers = await knex.schema.hasTable('customers');
  if (!hasCustomers) {
    await knex.schema.createTable('customers', (t) => {
      t.increments('id').primary();
      t.string('login_id').unique();
      t.string('name').notNullable();
      t.string('phone').notNullable();
      t.string('email');
      t.text('address');
      t.text('productToBuy');
      t.string('type').defaultTo('retail');
      t.string('password');
      t.string('panNo');
      t.text('alternativeAddress');
      t.string('alternativePhone');
      t.string('created_at').defaultTo(knex.fn.now());
    });
  }

  // orders
  const hasOrders = await knex.schema.hasTable('orders');
  if (!hasOrders) {
    await knex.schema.createTable('orders', (t) => {
      t.string('id').primary();
      t.integer('customerId').notNullable();
      t.string('customerName');
      t.string('customerPhone');
      t.string('customerEmail');
      t.text('items').notNullable();
      t.decimal('total', 14, 2).notNullable().defaultTo(0);
      t.string('status').defaultTo('pending');
      t.string('date').notNullable();
      t.string('created_at').defaultTo(knex.fn.now());
    });
  }

  // chats
  const hasChats = await knex.schema.hasTable('chats');
  if (!hasChats) {
    await knex.schema.createTable('chats', (t) => {
      t.increments('id').primary();
      t.integer('customerId').notNullable();
      t.string('sender').notNullable();
      t.text('message').notNullable();
      t.string('timestamp').defaultTo(knex.fn.now());
    });
  }

  // transactions
  const hasTransactions = await knex.schema.hasTable('transactions');
  if (!hasTransactions) {
    await knex.schema.createTable('transactions', (t) => {
      t.increments('id').primary();
      t.string('date').notNullable();
      t.integer('entity_id');
      t.string('entity_type').notNullable();
      t.string('type').notNullable();
      t.string('ref_no');
      t.decimal('debit', 14, 2).defaultTo(0.00);
      t.decimal('credit', 14, 2).defaultTo(0.00);
      t.text('narration');
      t.string('created_at').defaultTo(knex.fn.now());
    });
  }

  // accounts
  const hasAccounts = await knex.schema.hasTable('accounts');
  if (!hasAccounts) {
    await knex.schema.createTable('accounts', (t) => {
      t.increments('id').primary();
      t.string('account_name').notNullable();
      t.string('account_type').notNullable();
      t.decimal('opening_balance', 14, 2).defaultTo(0.00);
    });
  }

  // notifications
  const hasNotifications = await knex.schema.hasTable('notifications');
  if (!hasNotifications) {
    await knex.schema.createTable('notifications', (t) => {
      t.increments('id').primary();
      t.string('type').notNullable();
      t.string('title').notNullable();
      t.text('body');
      t.text('data');
      t.string('role');
      t.integer('user_id');
      t.integer('read').defaultTo(0);
      t.string('created_at').defaultTo(knex.fn.now());
    });
  }

  // products stock entries
  const hasStockEntries = await knex.schema.hasTable('stock_entries');
  if (!hasStockEntries) {
    await knex.schema.createTable('stock_entries', (t) => {
      t.string('id').primary();
      t.string('productId').notNullable();
      t.string('warehouseId');
      t.decimal('qty', 14, 3).notNullable();
      t.string('type').notNullable();
      t.string('date').notNullable();
      t.text('note');
      t.string('created_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  // No-op for now
}
