// client/functions/api/users.js
// ─── Cloudflare Pages Function: POS Users Management ─────────────────────────
//
// GET  /api/users        → returns all users from D1 database (login table)
// POST /api/users        → creates or updates a user in D1 database
//
// ─────────────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-pos-token',
  'cache-control': 'no-store',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
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

  const tableInfo = await db.prepare('PRAGMA table_info(login)').all();
  const columns = new Set((tableInfo?.results ?? []).map((c) => c.name));
  if (!columns.has('address')) {
    await db.prepare("ALTER TABLE login ADD COLUMN address TEXT").run();
  }
  if (!columns.has('alternative_phone')) {
    await db.prepare("ALTER TABLE login ADD COLUMN alternative_phone TEXT").run();
  }
  if (!columns.has('bio')) {
    await db.prepare("ALTER TABLE login ADD COLUMN bio TEXT").run();
  }
  if (!columns.has('avatar')) {
    await db.prepare("ALTER TABLE login ADD COLUMN avatar TEXT").run();
  }
  if (!columns.has('pan_no')) {
    await db.prepare('ALTER TABLE login ADD COLUMN pan_no TEXT').run();
  }
  if (!columns.has('profile_photo')) {
    await db.prepare('ALTER TABLE login ADD COLUMN profile_photo TEXT').run();
  }
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS });

// GET /api/users
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  try {
    await ensurePOSUsersTable(env.DB, env);
    const { results } = await env.DB.prepare('SELECT id, email, display_name, role, phone, address, alternative_phone, bio, avatar, pan_no, profile_photo FROM login ORDER BY id DESC').all();
    
    // Map D1 schema to frontend schema (everyone is active since active column is omitted in custom schema)
    const users = results.map(u => ({
      _id: String(u.id),
      name: u.display_name,
      email: u.email,
      username: u.email,
      role: u.role,
      phone: u.phone || '',
      address: u.address || '',
      alternativePhone: u.alternative_phone || '',
      bio: u.bio || '',
      avatar: u.avatar || '👤',
      panNo: u.pan_no || '',
      profilePhoto: u.profile_photo || '',
      status: 'active'
    }));

    return json({ success: true, users });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

// POST /api/users
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ success: false, error: 'D1 database binding missing.' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400);
  }

  const { _id, name, username, role, phone, password, address, alternativePhone, bio, avatar, panNo, profilePhoto } = body;

  try {
    await ensurePOSUsersTable(env.DB, env);

    if (_id) {
      // ── UPDATE EXISTING USER ──
      const userId = parseInt(_id);

      // Fetch user first to see if they exist
      const existing = await env.DB.prepare('SELECT id, email FROM login WHERE id = ?1').bind(userId).first();
      if (!existing) {
        return json({ success: false, error: 'User not found.' }, 404);
      }

      let query = 'UPDATE login SET ';
      const params = [];
      const updates = [];

      if (name !== undefined) {
        updates.push('display_name = ?' + (params.length + 1));
        params.push(name.trim());
      }
      if (role !== undefined) {
        updates.push('role = ?' + (params.length + 1));
        params.push(role);
      }
      if (username !== undefined) {
        updates.push('email = ?' + (params.length + 1));
        params.push(username.trim().toLowerCase());
      }
      if (phone !== undefined) {
        updates.push('phone = ?' + (params.length + 1));
        params.push(phone.trim());
      }
      if (address !== undefined) {
        updates.push('address = ?' + (params.length + 1));
        params.push(address.trim());
      }
      if (alternativePhone !== undefined) {
        updates.push('alternative_phone = ?' + (params.length + 1));
        params.push(alternativePhone.trim());
      }
      if (bio !== undefined) {
        updates.push('bio = ?' + (params.length + 1));
        params.push(bio.trim());
      }
      if (avatar !== undefined) {
        updates.push('avatar = ?' + (params.length + 1));
        params.push(avatar);
      }
      if (profilePhoto !== undefined) {
        updates.push('profile_photo = ?' + (params.length + 1));
        params.push(profilePhoto);
      }
      if (password !== undefined && password.trim() !== '') {
        // Use user email as salt for hashing new password
        const targetEmail = username !== undefined ? username.trim().toLowerCase() : existing.email;
        const hash = await sha256Hex(password.trim() + targetEmail);
        updates.push('password_hash = ?' + (params.length + 1));
        params.push(hash);
      }

      if (updates.length === 0) {
        return json({ success: true });
      }

      query += updates.join(', ') + ' WHERE id = ?' + (params.length + 1);
      params.push(userId);

      await env.DB.prepare(query).bind(...params).run();

      // Retrieve updated user to return
      const updated = await env.DB.prepare('SELECT id, email, display_name, role, phone, address, alternative_phone, bio, avatar, pan_no, profile_photo FROM login WHERE id = ?1').bind(userId).first();
      return json({
        success: true,
        user: {
          _id: String(updated.id),
          name: updated.display_name,
          email: updated.email,
          username: updated.email,
          role: updated.role,
          phone: updated.phone || '',
          address: updated.address || '',
          alternativePhone: updated.alternative_phone || '',
          bio: updated.bio || '',
          avatar: updated.avatar || '👤',
          panNo: updated.pan_no || '',
          profilePhoto: updated.profile_photo || '',
          status: 'active'
        }
      });

    } else {
      // ── CREATE NEW USER ──
      if (!name || !username || !password) {
        return json({ success: false, error: 'Name, username, and password are required for new users.' }, 400);
      }

      const email = username.trim().toLowerCase();
      // Use email as salt for hashing new passwords
      const hash = await sha256Hex(password.trim() + email);

      // Check if username/email already exists
      const conflict = await env.DB.prepare('SELECT id FROM login WHERE email = ?1').bind(email).first();
      if (conflict) {
        return json({ success: false, error: 'Username already exists.' }, 400);
      }

      await env.DB.prepare(
        'INSERT INTO login (email, display_name, role, phone, password_hash, address, alternative_phone, bio, avatar, pan_no, profile_photo) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)'
      ).bind(email, name.trim(), role || 'cashier', (phone || '').trim(), hash, address || null, alternativePhone || null, bio || null, avatar || '👤', panNo || null, profilePhoto || null).run();

      // Find the last inserted user
      const created = await env.DB.prepare('SELECT id, email, display_name, role, phone, address, alternative_phone, bio, avatar, pan_no, profile_photo FROM login WHERE email = ?1').bind(email).first();
      return json({
        success: true,
        user: {
          _id: String(created.id),
          name: created.display_name,
          email: created.email,
          username: created.email,
          role: created.role,
          phone: created.phone || '',
          address: created.address || '',
          alternativePhone: created.alternative_phone || '',
          bio: created.bio || '',
          avatar: created.avatar || '👤',
          panNo: created.pan_no || '',
          profilePhoto: created.profile_photo || '',
          status: 'active'
        }
      });
    }
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}
