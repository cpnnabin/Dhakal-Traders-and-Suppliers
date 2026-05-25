const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function ensureAdminsSchema(db, env) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const countRes = await db.prepare('SELECT COUNT(*) as count FROM admins').first();
  if (countRes && countRes.count === 0) {
    const seedEmail = (env.ADMIN_EMAIL || 'dipak.sharma@dhakaltradersandsuppliers.com').toLowerCase().trim();
    const seedPassword = (env.ADMIN_PASSWORD || 'change-this-admin-password').trim();

    const salt = generateSalt();
    const passwordHash = await hashPassword(seedPassword, salt);

    await db.prepare('INSERT INTO admins (email, password_hash, salt) VALUES (?1, ?2, ?3)')
      .bind(seedEmail, passwordHash, salt)
      .run();
  }
}

async function ensureContactsSchema(db) {
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT, subject TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    )
    .run();

  const tableInfo = await db.prepare('PRAGMA table_info(contacts)').all();
  const columns = new Set((tableInfo?.results ?? []).map((c) => c.name));

  if (!columns.has('email')) {
    await db.prepare('ALTER TABLE contacts ADD COLUMN email TEXT').run();
  }
  if (!columns.has('phone')) {
    await db.prepare('ALTER TABLE contacts ADD COLUMN phone TEXT').run();
  }
  if (!columns.has('subject')) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN subject TEXT NOT NULL DEFAULT 'inquiry'").run();
  }
  if (!columns.has('created_at')) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP").run();
  }
}

export const onRequestOptions = async () => new Response(null, { status: 204 });

export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return json({ success: false, error: 'D1 binding missing.' }, 500);
  }

  const providedEmail = (request.headers.get('x-admin-email') || '').toLowerCase().trim();
  const providedPassword = (request.headers.get('x-admin-password') || '').trim();

  if (!providedEmail || !providedPassword) {
    return json({ success: false, error: 'Unauthorized: missing credentials' }, 401);
  }

  try {
    await ensureContactsSchema(env.DB);
    await ensureAdminsSchema(env.DB, env);

    const admin = await env.DB.prepare('SELECT email, password_hash, salt FROM admins WHERE email = ?1')
      .bind(providedEmail)
      .first();

    if (!admin) {
      return json({ success: false, error: 'Unauthorized: invalid credentials' }, 401);
    }

    const calculatedHash = await hashPassword(providedPassword, admin.salt);
    if (calculatedHash !== admin.password_hash) {
      return json({ success: false, error: 'Unauthorized: invalid credentials' }, 401);
    }

    const result = await env.DB.prepare(
      'SELECT id, name, email, phone, subject, message, created_at FROM contacts ORDER BY id DESC LIMIT 200',
    ).all();

    return json({ success: true, contacts: result?.results ?? [] });
  } catch (error) {
    return json({ success: false, error: `Failed to fetch contacts: ${error?.message ?? 'unknown error'}` }, 500);
  }
}

export async function onRequestPost() {
  return json({ success: false, error: 'Method Not Allowed' }, 405);
}
