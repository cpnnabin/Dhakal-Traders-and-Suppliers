import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';

const dbPath = path.resolve(process.cwd(), 'admin.sqlite');
if (!fs.existsSync(dbPath)) {
  console.error('No admin.sqlite found at', dbPath);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

// List of legacy/old table names to drop if present. Add more if needed.
const legacyTables = [
  'users',
  'user_roles',
  'login_new',
  'users_backup',
  'old_customers',
  'pos_customers',
  'customers_old',
  'legacy_sales',
  'legacy_purchases'
];

async function execAsync(s) {
  return new Promise((resolve, reject) => db.exec(s, (err) => (err ? reject(err) : resolve())));
}

(async () => {
  try {
    console.log('Dropping legacy tables (if they exist) in', dbPath);
    for (const t of legacyTables) {
      try {
        await execAsync(`DROP TABLE IF EXISTS ${t};`);
        console.log('Dropped (or not present):', t);
      } catch (err) {
        console.error('Error dropping', t, err.message || err);
      }
    }
    console.log('Done.');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
