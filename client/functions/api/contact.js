const VALID_SUBJECTS = new Set(['timur', 'herbs', 'daily', 'wholesale', 'inquiry']);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '');

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

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json(
      {
        success: false,
        error: 'D1 binding missing. Configure DB binding named "DB" in Cloudflare Pages settings.',
      },
      500,
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const name = sanitize(body?.name);
  const email = sanitize(body?.email).toLowerCase();
  const phone = sanitize(body?.phone) || null;
  const subject = sanitize(body?.subject);
  const message = sanitize(body?.message);

  if (!name) return json({ success: false, error: 'Name is required' }, 400);
  if (!email) return json({ success: false, error: 'Email is required' }, 400);
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ success: false, error: 'Valid email is required' }, 400);
  if (!subject) return json({ success: false, error: 'Subject is required' }, 400);
  if (!message) return json({ success: false, error: 'Message is required' }, 400);
  if (!VALID_SUBJECTS.has(subject)) {
    return json(
      {
        success: false,
        error: 'Subject must be one of: timur, herbs, daily, wholesale, inquiry',
      },
      400,
    );
  }

  try {
    await ensureContactsSchema(env.DB);

    const result = await env.DB.prepare(
      `INSERT INTO contacts (name, email, phone, subject, message, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
      .bind(name, email, phone, subject, message, new Date().toISOString())
      .run();

    return json({ success: true, id: result?.meta?.last_row_id ?? null });
  } catch (error) {
    console.error('Failed to insert contact:', error);
    return json({ success: false, error: `Failed to save message: ${error?.message ?? 'unknown error'}` }, 500);
  }
}

export async function onRequestGet() {
  return json({ success: false, error: 'Method Not Allowed' }, 405);
}
