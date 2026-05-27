export async function up(knex) {
  // Ensure notifications table has `role` and `read` columns
  const hasNotifications = await knex.schema.hasTable('notifications');
  if (hasNotifications) {
    const hasRole = await knex.schema.hasColumn('notifications', 'role').catch(() => false);
    if (!hasRole) {
      await knex.schema.table('notifications', (t) => {
        t.string('role');
      }).catch(() => {});
    }
    const hasRead = await knex.schema.hasColumn('notifications', 'read').catch(() => false);
    if (!hasRead) {
      await knex.schema.table('notifications', (t) => {
        t.integer('read').defaultTo(0);
      }).catch(() => {});
    }
  }

  // Create client_logs table to store small client-side diagnostics
  const hasClientLogs = await knex.schema.hasTable('client_logs');
  if (!hasClientLogs) {
    await knex.schema.createTable('client_logs', (t) => {
      t.increments('id').primary();
      t.string('url');
      t.string('resource_type');
      t.string('page');
      t.text('user_agent');
      t.text('payload');
      t.string('created_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  // no-op for now; leaving historic data intact
}
