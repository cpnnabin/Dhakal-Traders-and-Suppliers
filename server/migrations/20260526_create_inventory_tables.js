/**
 * Knex migration: create inventory-related tables including warehouse_stock
 */
export async function up(knex) {
  const hasCategories = await knex.schema.hasTable('inventory_categories');
  if (!hasCategories) {
    await knex.schema.createTable('inventory_categories', (t) => { t.string('id').primary(); t.string('name').notNullable(); t.string('description'); t.timestamp('created_at').defaultTo(knex.fn.now()); });
  }

  const hasBrands = await knex.schema.hasTable('inventory_brands');
  if (!hasBrands) {
    await knex.schema.createTable('inventory_brands', (t) => { t.string('id').primary(); t.string('name').notNullable(); t.string('description'); t.timestamp('created_at').defaultTo(knex.fn.now()); });
  }

  const hasWarehouses = await knex.schema.hasTable('warehouses');
  if (!hasWarehouses) {
    await knex.schema.createTable('warehouses', (t) => { t.string('id').primary(); t.string('name').notNullable(); t.string('location'); t.timestamp('created_at').defaultTo(knex.fn.now()); });
  }

  const hasBatches = await knex.schema.hasTable('batches');
  if (!hasBatches) {
    await knex.schema.createTable('batches', (t) => { t.string('id').primary(); t.string('productId').notNullable(); t.string('batch_no'); t.integer('qty').defaultTo(0); t.string('manufacture_date'); t.string('expiry_date'); t.timestamp('created_at').defaultTo(knex.fn.now()); });
  }

  const hasStockMovements = await knex.schema.hasTable('stock_movements');
  if (!hasStockMovements) {
    await knex.schema.createTable('stock_movements', (t) => { t.string('id').primary(); t.string('productId').notNullable(); t.string('warehouseId'); t.string('batchId'); t.integer('qty').notNullable(); t.string('type').notNullable(); t.string('note'); t.timestamp('created_at').defaultTo(knex.fn.now()); });
  }

  const hasDamage = await knex.schema.hasTable('damage_stock');
  if (!hasDamage) {
    await knex.schema.createTable('damage_stock', (t) => { t.string('id').primary(); t.string('productId').notNullable(); t.integer('qty').notNullable(); t.string('reason'); t.timestamp('created_at').defaultTo(knex.fn.now()); });
  }

  const hasWarehouseStock = await knex.schema.hasTable('warehouse_stock');
  if (!hasWarehouseStock) {
    await knex.schema.createTable('warehouse_stock', (t) => { t.string('id').primary(); t.string('productId').notNullable(); t.string('warehouseId').notNullable(); t.integer('qty').defaultTo(0); t.timestamp('updated_at').defaultTo(knex.fn.now()); });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('warehouse_stock');
  await knex.schema.dropTableIfExists('damage_stock');
  await knex.schema.dropTableIfExists('stock_movements');
  await knex.schema.dropTableIfExists('batches');
  await knex.schema.dropTableIfExists('warehouses');
  await knex.schema.dropTableIfExists('inventory_brands');
  await knex.schema.dropTableIfExists('inventory_categories');
}
