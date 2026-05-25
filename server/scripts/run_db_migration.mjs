import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const migrationFile = process.argv[2] || path.join('..', 'database', 'migrations', '20260523_add_orders_payments.sql');
const dbFile = process.argv[3] || path.join('..', 'database', 'dhakal.db');

console.log('Migration file:', migrationFile);
console.log('Database file:', dbFile);

if (!fs.existsSync(migrationFile)) {
  console.error('Migration file not found:', migrationFile);
  process.exit(2);
}

const sql = fs.readFileSync(migrationFile, 'utf8');

sqlite3.verbose();
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(3);
  }
  console.log('Opened DB:', dbFile);

  db.exec(sql, (err) => {
    if (err) {
      console.error('Migration failed:', err.message);
      db.close(() => process.exit(4));
      return;
    }
    console.log('Migration applied successfully.');
    db.close((cerr) => {
      if (cerr) console.error('Error closing DB:', cerr.message);
      process.exit(0);
    });
  });
});
