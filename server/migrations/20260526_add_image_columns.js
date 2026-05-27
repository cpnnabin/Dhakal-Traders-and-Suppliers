export async function up(knex) {
  // add products.imageUrl if missing
  const hasProducts = await knex.schema.hasTable('products');
  if (hasProducts) {
    const hasImageUrl = await knex.schema.hasColumn('products', 'imageUrl');
    if (!hasImageUrl) {
      await knex.schema.alterTable('products', (t) => {
        t.string('imageUrl');
      });
    }
  }

  // ensure login.profile_photo exists
  const hasLogin = await knex.schema.hasTable('login');
  if (hasLogin) {
    const hasProfilePhoto = await knex.schema.hasColumn('login', 'profile_photo');
    if (!hasProfilePhoto) {
      await knex.schema.alterTable('login', (t) => {
        t.string('profile_photo');
      });
    }
  }
}

export async function down(knex) {
  const hasProducts = await knex.schema.hasTable('products');
  if (hasProducts) {
    const hasImageUrl = await knex.schema.hasColumn('products', 'imageUrl');
    if (hasImageUrl) {
      await knex.schema.alterTable('products', (t) => {
        t.dropColumn('imageUrl');
      });
    }
  }

  const hasLogin = await knex.schema.hasTable('login');
  if (hasLogin) {
    const hasProfilePhoto = await knex.schema.hasColumn('login', 'profile_photo');
    if (hasProfilePhoto) {
      await knex.schema.alterTable('login', (t) => {
        t.dropColumn('profile_photo');
      });
    }
  }
}
