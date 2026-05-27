import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';

const cwd = process.cwd();
const dbPath = path.resolve(cwd, 'admin.sqlite');
if (!fs.existsSync(dbPath)) {
  console.error('No admin.sqlite found at', dbPath);
  process.exit(1);
}
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.resolve(cwd, `admin.sqlite.${ts}.bak`);
fs.copyFileSync(dbPath, backupPath);
console.log('Backed up', dbPath, '->', backupPath);

// remove current DB to start fresh
fs.unlinkSync(dbPath);
console.log('Removed original admin.sqlite, creating fresh DB');

const db = new sqlite3.Database(dbPath);
const sqlPath = path.resolve(cwd, '..', 'database', 'setup.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('setup.sql not found at', sqlPath);
  process.exit(1);
}
const sql = fs.readFileSync(sqlPath, 'utf8');

function execAsync(s) {
  return new Promise((resolve, reject) => db.exec(s, (err) => (err ? reject(err) : resolve())));
}
function allAsync(s) {
  return new Promise((resolve, reject) => db.all(s, (err, rows) => (err ? reject(err) : resolve(rows))));
}

(async () => {
  try {
    await execAsync('PRAGMA foreign_keys = ON;');
    await execAsync(sql);
    console.log('Applied setup.sql to', dbPath);
    const counts = await Promise.all([
      allAsync('SELECT COUNT(*) AS c FROM login'),
      allAsync('SELECT COUNT(*) AS c FROM product_stock'),
      allAsync('SELECT COUNT(*) AS c FROM sales'),
      allAsync('SELECT COUNT(*) AS c FROM purchases')
    ]);
    console.log('login rows:', counts[0][0].c);
    console.log('product_stock rows:', counts[1][0].c);
    console.log('sales rows:', counts[2][0].c);
    console.log('purchases rows:', counts[3][0].c);
  } catch (err) {
    console.error('Error applying setup.sql:', err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
