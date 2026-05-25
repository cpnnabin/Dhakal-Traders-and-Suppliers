const path = require('path');
require('dotenv').config();

const root = path.resolve(__dirname);
const sqliteFile = process.env.ADMIN_DB_FILE || path.resolve(root, 'admin.sqlite');

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: sqliteFile
    },
    useNullAsDefault: true,
    migrations: { directory: path.resolve(root, 'migrations') }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    migrations: { directory: path.resolve(root, 'migrations') }
  }
};
