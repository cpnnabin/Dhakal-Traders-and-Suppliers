import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname);
const sqliteFile = process.env.ADMIN_DB_FILE || resolve(root, 'admin.sqlite');

export default {
  development: {
    client: 'sqlite3',
    connection: {
      filename: sqliteFile
    },
    useNullAsDefault: true,
    migrations: { directory: resolve(root, 'migrations') }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    migrations: { directory: resolve(root, 'migrations') }
  }
};
