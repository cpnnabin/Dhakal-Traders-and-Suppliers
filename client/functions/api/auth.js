// functions/api/auth.js
// ─── Cloudflare Pages Function: POS Authentication ───────────────────────────
//
// POST /api/auth   { email, password }
//   → 200  { success: true,  token, cashier }
//   → 401  { success: false, error }
//
// GET  /api/auth   { header: x-pos-token }
//   → 200  { success: true,  cashier }
//   → 401  { success: false, error }
//
// DELETE /api/auth (logout — client just discards the token)
//
// Environment variables required (Cloudflare Dashboard → Settings → Variables):
//   DB            — D1 database binding
//   ADMIN_EMAIL   — seed admin e-mail  (default: dipak.sharma@…)
//   ADMIN_PASSWORD— seed admin password (change after first deploy)
//
// Token strategy: signed HMAC-SHA-256 of  { sub, iat, exp }  using secret key
//   stored in env.POS_JWT_SECRET (any long random string).
//   We keep it simple and stateless — no DB lookups needed for token validation.
// ─────────────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-pos-token',
  'cache-control': 'no-store',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });

// ── Crypto helpers ────────────────────────────────────────────────────────────

function generateSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  return sha256Hex(password + salt);
}

// ── Simple stateless token (base64url-encoded JSON + HMAC signature) ──────────

async function signToken(payload, secret) {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const body    = btoa(JSON.stringify(payload)).replace(/=/g, '');
  const sigBuf  = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    ),
    new TextEncoder().encode(`${header}.${body}`)
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${body}.${sig}`;
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;
    const expectedSigBuf = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      ),
      new TextEncoder().encode(`${header}.${body}`)
    );
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expectedSigBuf)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    if (sig !== expectedSig) return null;

    const payload = JSON.parse(atob(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── DB Schema ─────────────────────────────────────────────────────────────────

async function verifyUserPassword(email, inputPassword, dbHash) {
  // Check if it matches default hardcoded salted hashes from the seed values first
  if (email === 'admin@dhakaltraders.com' && dbHash === '3ac8d121bb8c5c083a3ae242012931cdfaee780de9889ed96dd3888784e2db6a') {
    const calculated = await sha256Hex(inputPassword + '3df395c155649e40ea9250313a15022e');
    return calculated === dbHash;
  }
  if (email === 'admin@dhakaltraders.com' && dbHash === '2eec76506c072a3b80edb95a82c110c7ac1e3eec222aa5efd9f53cb7060e2d7f') {
    const calculated = await sha256Hex(inputPassword + '3df395c155649e40ea9250313a15022e');
    return calculated === dbHash;
  }
  if (email === 'owner@dhakaltraders.com' && dbHash === '05f35d7dcd8f96a7fbaaee1900edd20df8b9acd6a8c5efc0d5ffa2da284a516b') {
    const calculated = await sha256Hex(inputPassword + 'fe877f79864df8449cf1d1ca7536b47a');
    return calculated === dbHash;
  }
  if (email === 'cashier@dhakaltraders.com' && dbHash === 'f5a3c7e385121b3ea1279f922ded8c7751dd56fef78a1cf39896ab20f7057717') {
    const calculated = await sha256Hex(inputPassword + 'aab0c9a2357f59aaa2ae79fd1d081729');
    return calculated === dbHash;
  }

  // Otherwise, use email-salted hash for new users
  const emailSalted = await sha256Hex(inputPassword + email);
  return emailSalted === dbHash;
}

async function ensurePOSUsersTable(db, env) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS login (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE NOT NULL,
      display_name  TEXT NOT NULL DEFAULT 'Cashier',
      role          TEXT NOT NULL DEFAULT 'cashier',
      phone         TEXT,
      password_hash TEXT NOT NULL
    )
  `).run();

  // Seed first admin if table is empty
  const { count } = await db.prepare('SELECT COUNT(*) as count FROM login').first();
  if (count === 0) {
    const email    = 'admin@dhakaltraders.com';
    // Salted hash for 'dhakal@pos2026' with salt '3df395c155649e40ea9250313a15022e'
    const hash     = '3ac8d121bb8c5c083a3ae242012931cdfaee780de9889ed96dd3888784e2db6a';

    await db.prepare(
      'INSERT INTO login (email, display_name, role, phone, password_hash) VALUES (?1, ?2, ?3, ?4, ?5)'
    ).bind(email, 'Cashier Admin', 'owner', '9857823400', hash).run();
  }
}

// ── Request Handlers ──────────────────────────────────────────────────────────

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

/** POST /api/auth  — login with email + password → returns token */
export async function onRequestPost({ request, env }) {
  if (!env.DB)             return json({ success: false, error: 'D1 database binding missing.' }, 500);
  if (!env.POS_JWT_SECRET) return json({ success: false, error: 'POS_JWT_SECRET env variable not set.' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400);
  }

  const email    = (body.email    || '').toLowerCase().trim();
  const password = (body.password || '').trim();

  if (!email || !password)
    return json({ success: false, error: 'Email and password are required.' }, 400);

  try {
    await ensurePOSUsersTable(env.DB, env);

    let user = await env.DB
      .prepare('SELECT id, email, display_name, role, password_hash FROM login WHERE email = ?1')
      .bind(email).first();

    let isValid = false;
    if (user) {
      isValid = await verifyUserPassword(email, password, user.password_hash);
    } else {
      // Look in customers table
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS pos_customers (
          id                 INTEGER PRIMARY KEY AUTOINCREMENT,
          login_id           TEXT,
          name               TEXT NOT NULL,
          phone              TEXT NOT NULL,
          email              TEXT,
          address            TEXT,
          type               TEXT DEFAULT 'retail',
          password           TEXT,
          panNo              TEXT,
          alternativeAddress TEXT,
          alternativePhone   TEXT,
          created_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      const cust = await env.DB
        .prepare('SELECT id, name, phone, email, password FROM pos_customers WHERE phone = ?1 OR email = ?1')
        .bind(email).first();

      if (cust) {
        const expectedPassword = (cust.password || cust.phone || '12345').trim();
        if (expectedPassword === password) {
          user = {
            id: String(cust.id),
            email: cust.email || cust.phone,
            display_name: cust.name,
            role: 'customer'
          };
          isValid = true;
        }
      }
    }

    if (!user || !isValid)
      return json({ success: false, error: 'Invalid credentials.' }, 401);

    // Issue 8-hour token
    const now = Math.floor(Date.now() / 1000);
    const token = await signToken(
      { sub: user.id, email: user.email, name: user.display_name, role: user.role, iat: now, exp: now + 28800 },
      env.POS_JWT_SECRET
    );

    return json({ success: true, token, cashier: user.display_name, role: user.role });
  } catch (err) {
    // Log the error to Cloudflare function logs for easier debugging
    try { console.error('Auth error:', err); } catch (e) {}
    return json({ success: false, error: `Auth error: ${err?.message ?? 'unknown'}` }, 500);
  }
}

/** GET /api/auth  — validate token from x-pos-token header */
export async function onRequestGet({ request, env }) {
  if (!env.POS_JWT_SECRET) return json({ success: false, error: 'POS_JWT_SECRET not configured.' }, 500);

  const token = request.headers.get('x-pos-token') || '';
  if (!token)   return json({ success: false, error: 'No token provided.' }, 401);

  const payload = await verifyToken(token, env.POS_JWT_SECRET);
  if (!payload) return json({ success: false, error: 'Invalid or expired token.' }, 401);

  return json({ success: true, cashier: payload.name, role: payload.role, email: payload.email });
}

/** DELETE /api/auth  — logout (client-side only; token is stateless) */
export async function onRequestDelete() {
  return json({ success: true, message: 'Logged out.' });
}
