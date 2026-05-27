import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

// Use current working directory (server/) to locate admin.sqlite reliably on Windows
const ROOT = process.cwd();
const DB = path.join(ROOT, 'admin.sqlite');
const BACKUP = DB + '.bak';

console.log('DB:', DB);
if (!fs.existsSync(DB)) {
  console.error('Database file not found:', DB);
  process.exit(1);
}

// backup
try {
  fs.copyFileSync(DB, BACKUP, fs.constants.COPYFILE_EXCL);
  console.log('Backup created at', BACKUP);
} catch (e) {
  console.log('Backup already exists or could not be created:', e.message);
}

const db = new sqlite3.Database(DB);
function runAsync(sql, params=[]) {
  return new Promise((resolve, reject) => db.run(sql, params, function(err){ if (err) return reject(err); resolve(this); } ));
}
function allAsync(sql, params=[]) { return new Promise((resolve,reject)=> db.all(sql, params, (e,r)=> e?reject(e):resolve(r))); }

(async ()=>{
  try {
    // Check which tables exist
    const tables = await allAsync("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','login')");
    const tableNames = tables.map(r=>r.name);

    if (tableNames.includes('login')) {
      console.log('Inspecting login columns...');
      const cols = await allAsync("PRAGMA table_info('login')");
      const existing = new Set(cols.map(c=>c.name));
      console.log('Existing login cols:', Array.from(existing).join(','));

      const toAdd = [];
      const want = {
        'created_at': "TEXT DEFAULT CURRENT_TIMESTAMP",
        'bio': 'TEXT',
        'avatar': "TEXT DEFAULT '👤'",
        'profile_photo': 'TEXT',
        'created_by_user_id': 'INTEGER',
        'password_hash': "TEXT DEFAULT ''",
        'address': 'TEXT',
        'alternative_phone': 'TEXT',
        'pan_no': 'TEXT'
      };
      for (const [col,def] of Object.entries(want)) {
        if (!existing.has(col)) toAdd.push({col,def});
      }

      for (const a of toAdd) {
        const sql = `ALTER TABLE login ADD COLUMN ${a.col} ${a.def}`;
        console.log('Adding column:', a.col);
        await runAsync(sql);
      }
    }

    // Begin migration using login_new
    console.log('Creating login_new...');
    await runAsync('BEGIN TRANSACTION');
    await runAsync(`CREATE TABLE IF NOT EXISTS login_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL DEFAULT 'Cashier',
      role TEXT NOT NULL DEFAULT 'cashier',
      phone TEXT,
      password_hash TEXT NOT NULL DEFAULT '',
      address TEXT,
      alternative_phone TEXT,
      bio TEXT,
      avatar TEXT DEFAULT '👤',
      pan_no TEXT,
      profile_photo TEXT,
      created_by_user_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    await runAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_login_new_email_lower ON login_new(LOWER(email))');

    // copy from users if exists (reuse tableNames from above)
    if (tableNames.includes('users')) {
      console.log('Copying from users into login_new');
      await runAsync(`INSERT OR IGNORE INTO login_new (id,email,display_name,role,phone,password_hash,address,alternative_phone,bio,avatar,pan_no,profile_photo,created_by_user_id,created_at)
        SELECT id, email, COALESCE(name,email), role, phone, COALESCE(password_hash,''), address, alternative_phone, COALESCE(bio,''), COALESCE(avatar,'👤'), pan_no, COALESCE(profile_photo,''), created_by_user_id, created_at
        FROM users`);
    }

    if (tableNames.includes('login')) {
      console.log('Merging existing login into login_new (login overrides users)');
      await runAsync(`INSERT OR REPLACE INTO login_new (id,email,display_name,role,phone,password_hash,address,alternative_phone,bio,avatar,pan_no,profile_photo,created_by_user_id,created_at)
        SELECT id, email, COALESCE(display_name,email), role, phone, COALESCE(password_hash,''), address, alternative_phone, COALESCE(bio,''), COALESCE(avatar,'👤'), pan_no, COALESCE(profile_photo,''), created_by_user_id, COALESCE(created_at, CURRENT_TIMESTAMP)
        FROM login`);
    }

    // verify counts
    const cnt = await allAsync('SELECT COUNT(*) as c FROM login_new');
    console.log('login_new row count:', cnt[0].c);

    // drop old login and rename
    console.log('Dropping old login and renaming login_new -> login');
    await runAsync('DROP TABLE IF EXISTS login');
    await runAsync('ALTER TABLE login_new RENAME TO login');

    // drop users table
    if (tableNames.includes('users')) {
      console.log('Dropping users table');
      await runAsync('DROP TABLE IF EXISTS users');
    }

    await runAsync('COMMIT');

    console.log('Migration complete. Final login schema:');
    const final = await allAsync("PRAGMA table_info('login')");
    console.table(final.map(c=>({cid:c.cid,name:c.name,type:c.type,notnull:c.notnull,dflt_value:c.dflt_value}))); 

    const sample = await allAsync('SELECT id,email,display_name,role,phone,address,alternative_phone,pan_no,avatar,created_at FROM login ORDER BY id LIMIT 20');
    console.log('Sample rows:');
    console.table(sample);

    db.close();
    process.exit(0);
  } catch (err) {
    console.error('Migration error', err);
    try { await runAsync('ROLLBACK'); } catch(e){}
    db.close();
    process.exit(1);
  }
})();
