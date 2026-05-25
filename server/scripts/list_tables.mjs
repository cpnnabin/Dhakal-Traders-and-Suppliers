import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB = join(__dirname, '..', 'admin.sqlite');
const db = new sqlite3.Database(DB);

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, rows) => {
  if (err) { console.error(err); process.exit(1); }
  console.log('Tables in', DB);
  for (const r of rows) console.log('-', r.name);
  db.close();
});
