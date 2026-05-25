import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import knex from './db/knex.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ADMIN_DB_FILE = join(__dirname, 'admin.sqlite');

// initialize SQLite db
const sqlite = sqlite3.verbose();
const sqliteDb = new sqlite.Database(ADMIN_DB_FILE);

// Promisified SQL run, all, and get helpers
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

// Scheduled expiry checker (runs daily by default)
async function runExpiryCheckAndNotify(days = 30) {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString();
    const rows = await knex('batches').whereNotNull('expiry_date').andWhere('expiry_date', '<=', cutoff).orderBy('expiry_date','asc');
    if (!rows || rows.length === 0) return { count: 0 };
    // create notifications
    for (const b of rows) {
      try { await createNotification({ type: 'expiry', title: `Batch expiry ${b.batch_no || b.id}`, body: `Batch ${b.batch_no || b.id} for product ${b.productId} expires ${b.expiry_date}`, data: b, role: 'admin' }); } catch (e) {}
    }
    try { io.emit('stock:expiry', rows); } catch (e) {}

    // send email summary if SMTP configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const sendTo = process.env.EXPIRY_ALERT_EMAILS; // comma-separated
    if (smtpHost && smtpUser && smtpPass && sendTo) {
      try {
        const nodemailer = (await import('nodemailer')).default;
        const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: { user: smtpUser, pass: smtpPass } });
        const html = `<p>Found ${rows.length} expiring batches within ${days} days.</p><ul>${rows.map(r=>`<li>${r.batch_no||r.id} — ${r.productId} — exp: ${r.expiry_date}</li>`).join('')}</ul>`;
        await transporter.sendMail({ from: process.env.FROM_EMAIL || smtpUser, to: sendTo, subject: `Expiry Alert — ${rows.length} batches`, html });
      } catch (e) { console.error('Expiry email send failed', e); }
    }

    return { count: rows.length, batches: rows };
  } catch (e) {
    console.error('runExpiryCheckAndNotify error', e);
    return { count: 0, error: e.message };
  }
}

// start periodic job if enabled
// start periodic job if enabled
if (process.env.ENABLE_EXPIRY_CRON === '1') {
  const days = Number(process.env.EXPIRY_DAYS || 30);
  const intervalMs = Number(process.env.EXPIRY_INTERVAL_MS || 24 * 3600 * 1000);
  // run on startup after slight delay
  setTimeout(() => runExpiryCheckAndNotify(days).then(r=>console.log('Expiry check run at startup', r)).catch(()=>{}), 5000);

  // If configured, prefer node-cron scheduling (CRON_EXPR), otherwise fallback to simple interval
  if (process.env.USE_NODE_CRON === '1') {
    const cronExpr = process.env.CRON_EXPR || '0 2 * * *'; // default daily at 02:00
    (async () => {
      try {
        const cron = (await import('node-cron')).default;
        cron.schedule(cronExpr, () => {
          runExpiryCheckAndNotify(days).then(r => console.log('Scheduled expiry check (cron)', r)).catch(()=>{});
        });
        console.log('Expiry cron scheduled with expr', cronExpr);
      } catch (e) {
        console.warn('node-cron not available, falling back to setInterval', e);
        setInterval(() => runExpiryCheckAndNotify(days).then(r=>console.log('Scheduled expiry check', r)).catch(()=>{}), intervalMs);
      }
    })();
  } else {
    setInterval(() => runExpiryCheckAndNotify(days).then(r=>console.log('Scheduled expiry check', r)).catch(()=>{}), intervalMs);
  }
}

// Schema initialization is handled via Knex migrations (see migrations/).
// Perform lightweight seed and safety checks using Knex so both SQLite and Postgres are supported.
(async function ensureSeedsAndColumns() {
  try {
    // Seed admins if empty
    const adminCountRow = await knex('admins').count({ count: '*' }).first().catch(() => null);
    const adminCount = adminCountRow ? Number(adminCountRow.count) : 0;
    if (adminCount === 0) {
      const email = 'admin@dhakaltraders.com';
      const hash = bcrypt.hashSync('dhakal@pos2026', 10);
      const now = new Date().toISOString();
      await knex('admins').insert({ email, password: hash, created_at: now }).catch(() => {});
    }

    // Seed default users in login table
    const loginCountRow = await knex('login').count({ count: '*' }).first().catch(() => null);
    const loginCount = loginCountRow ? Number(loginCountRow.count) : 0;
    if (loginCount === 0) {
      await knex('login').insert([
        { email: 'admin@dhakaltraders.com', display_name: 'Cashier Admin', role: 'owner', phone: '9857823400', password_hash: SHARED_LOGIN_PASSWORD_HASH },
        { email: 'owner@dhakaltraders.com', display_name: 'Dipak Sharma', role: 'owner', phone: '9857823400', password_hash: SHARED_LOGIN_PASSWORD_HASH },
        { email: 'cashier@dhakaltraders.com', display_name: 'Ram Bahadur', role: 'cashier', phone: '9847000000', password_hash: SHARED_LOGIN_PASSWORD_HASH },
        { email: 'shyam@example.com', display_name: 'Shyam Kumar Store', role: 'customer', phone: '9812345678', password_hash: customerPasswordHash('pass123', 'shyam@example.com'), address: 'Biratnagar', bio: 'Retail Customer', avatar: '🛍️' },
        { email: 'hari@gmail.com', display_name: 'Hari Prasad', role: 'customer', phone: '9841000111', password_hash: customerPasswordHash('hari123', 'hari@gmail.com'), address: 'Kathmandu', bio: 'Retail Customer', avatar: '🛍️' }
      ]).catch(() => {});
    }

    const customerCountRow = await knex('customers').count({ count: '*' }).first().catch(() => null);
    const customerCount = customerCountRow ? Number(customerCountRow.count) : 0;
    if (customerCount === 0 && loginCount === 0) {
      await knex('customers').insert([
        { login_id: 4, name: 'Shyam Kumar Store', phone: '9812345678', email: 'shyam@example.com', address: 'Biratnagar', type: 'wholesale', pan_no: '123456789', created_by_user_id: 2 },
        { login_id: 5, name: 'Hari Prasad', phone: '9841000111', email: 'hari@gmail.com', address: 'Kathmandu', type: 'retail', pan_no: '', created_by_user_id: 3 }
      ]).catch(() => {});
    }

    // Ensure optional columns exist (migrations should handle this; these are safety checks)
    const hasCustomerEmail = await knex.schema.hasColumn('sales', 'customerEmail').catch(() => false);
    if (!hasCustomerEmail) await knex.schema.table('sales', (t) => t.string('customerEmail')).catch(() => {});
    const hasCustomerPhone = await knex.schema.hasColumn('sales', 'customerPhone').catch(() => false);
    if (!hasCustomerPhone) await knex.schema.table('sales', (t) => t.string('customerPhone')).catch(() => {});
    const hasCustomerLoginId = await knex.schema.hasColumn('sales', 'customerLoginId').catch(() => false);
    if (!hasCustomerLoginId) await knex.schema.table('sales', (t) => t.string('customerLoginId')).catch(() => {});

    // Login table extra columns
    const loginExtraCols = ['address','alternative_phone','bio','avatar','pan_no','profile_photo'];
    for (const col of loginExtraCols) {
      const has = await knex.schema.hasColumn('login', col).catch(() => false);
      if (!has) await knex.schema.table('login', (t) => t.string(col)).catch(() => {});
    }
  } catch (e) {
    console.error('Seed/migration helpers error', e);
  }
})();

function findAdminByEmail(email) {
  return new Promise((resolve, reject) => {
    sqliteDb.get('SELECT * FROM admins WHERE email = ?', [email], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function verifyAdminCredentials(email, plainPassword) {
  if (!email || !plainPassword) return false;
  const row = await findAdminByEmail(email).catch(() => null);
  if (!row) return false;
  return bcrypt.compareSync(plainPassword, row.password);
}

const sha256Hex = (text) => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

const normalizeLoginEmail = (email) => String(email || '').trim().toLowerCase().replace(/@dhakaltraders\.com\.np$/i, '@dhakaltraders.com');

const SHARED_LOGIN_PASSWORD = process.env.SHARED_LOGIN_PASSWORD || 'Tribe@123';
const SHARED_LOGIN_PASSWORD_HASH = sha256Hex(SHARED_LOGIN_PASSWORD);
const customerPasswordHash = (password, loginId) => sha256Hex(String(password || '').trim() + normalizeLoginEmail(loginId));

const verifyUserPassword = (email, inputPassword, dbHash) => {
  const password = String(inputPassword || '').trim();

  // Shared password for every role/user.
  if (password === SHARED_LOGIN_PASSWORD) return true;

  // Check default hardcoded salted hashes from seed first
  if (email === 'admin@dhakaltraders.com' && dbHash === '3ac8d121bb8c5c083a3ae242012931cdfaee780de9889ed96dd3888784e2db6a') {
    const calculated = sha256Hex(password + '3df395c155649e40ea9250313a15022e');
    return calculated === dbHash;
  }
  if (email === 'owner@dhakaltraders.com' && dbHash === '05f35d7dcd8f96a7fbaaee1900edd20df8b9acd6a8c5efc0d5ffa2da284a516b') {
    const calculated = sha256Hex(password + 'fe877f79864df8449cf1d1ca7536b47a');
    return calculated === dbHash;
  }
  if (email === 'cashier@dhakaltraders.com' && dbHash === 'f5a3c7e385121b3ea1279f922ded8c7751dd56fef78a1cf39896ab20f7057717') {
    const calculated = sha256Hex(password + 'aab0c9a2357f59aaa2ae79fd1d081729');
    return calculated === dbHash;
  }
  // Fallback credentials for development/testing
  if (email === 'admin@dhakaltraders.com' && password === SHARED_LOGIN_PASSWORD) return true;
  if (email === 'owner@dhakaltraders.com' && password === SHARED_LOGIN_PASSWORD) return true;
  if (email === 'cashier@dhakaltraders.com' && password === SHARED_LOGIN_PASSWORD) return true;

  // Otherwise, use email-salted hash for new users
  const emailSalted = sha256Hex(password + email);
  return emailSalted === dbHash;
};

// Simple POS token requirement middleware for admin/cashier actions
function requirePosAuth(req, res, next) {
  try {
    const token = req.headers['x-pos-token'] || (req.headers.authorization && String(req.headers.authorization).startsWith('Bearer ') ? String(req.headers.authorization).slice(7) : null);
    if (!token) return res.status(401).json({ success: false, error: 'Missing token' });
    try {
      const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
      const payload = jwt.verify(String(token), secret);
      // attach payload for handlers
      req.pos = payload;
      return next();
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

function requireRole(roles = []) {
  return function (req, res, next) {
    try {
      const payload = req.pos || {};
      const role = payload.role || payload.r || '';
      if (!role) return res.status(403).json({ success: false, error: 'Forbidden: missing role' });
      if (!roles.includes(role)) return res.status(403).json({ success: false, error: 'Forbidden: insufficient role' });
      return next();
    } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
  };
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://[::1]:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});
const PORT = process.env.PORT || 5001;

// Production hardening: require JWT_SECRET and FRONTEND_URL in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set in production environment — set JWT_SECRET to a strong secret. Server will continue for now.');
  }
  if (!process.env.FRONTEND_URL) {
    console.error('FATAL: FRONTEND_URL is not set in production environment (allowed CORS origins). Server will continue for now.');
  }
}

// --- Socket.IO handlers (simple stubs for realtime features) ---
io.on('connection', (socket) => {
  try {
    console.log('Socket connected:', socket.id);
    // attempt to authenticate socket via token (handshake.auth.token)
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token || socket.handshake.headers && (socket.handshake.headers['x-pos-token'] || socket.handshake.headers['authorization']);
      let raw = token;
      if (typeof raw === 'string' && raw.startsWith('Bearer ')) raw = raw.slice(7);
      if (typeof raw === 'string' && raw) {
        try {
          const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
          const payload = jwt.verify(raw, secret);
          socket.user = payload;
          // auto join role room if present
          if (payload && payload.role) {
            try { socket.join(`role:${payload.role}`); } catch (e) {}
          }
        } catch (e) {
          // invalid token — continue unauthenticated
        }
      }
    } catch (e) {}
    // join rooms by role or tenant if client requests
      socket.on('join', (room) => {
        try {
          // allow only joining rooms matching the authenticated user's role (unless owner/admin)
          if (typeof room === 'string' && room.startsWith('role:')) {
            const wanted = room.slice(5);
            const userRole = socket.user && socket.user.role ? String(socket.user.role) : null;
            if (!userRole) {
              socket.emit('join:denied', { reason: 'unauthenticated' });
              return;
            }
            const allowed = (userRole === wanted) || (userRole === 'owner') || (userRole === 'admin');
            if (!allowed) {
              socket.emit('join:denied', { reason: 'forbidden' });
              return;
            }
          }
          socket.join(room);
        } catch (e) {}
      });

    socket.on('leave', (room) => {
      try { socket.leave(room); } catch (e) {}
    });

    // simple ping
    socket.on('ping-server', (cb) => { try { if (typeof cb === 'function') cb({ pong: true, time: new Date().toISOString() }); } catch (e) {} });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected', socket.id, reason);
    });
  } catch (err) {
    console.error('Socket error', err);
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://[::1]:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

// Trust proxy so req.secure and x-forwarded-* headers are respected when behind a reverse proxy
app.set('trust proxy', 1);

// Redirect HTTP -> HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    try {
      const proto = req.headers['x-forwarded-proto'] || req.protocol || '';
      if (String(proto).includes('https') || req.secure) return next();
      // Only redirect for safe methods
      if (req.method === 'GET' || req.method === 'HEAD') {
        const host = req.headers.host || '';
        return res.redirect(301, `https://${host}${req.originalUrl}`);
      }
      return res.status(426).json({ success: false, error: 'Use HTTPS' });
    } catch (e) { return next(); }
  });
}

// --- Health check ---
app.get('/api/health', async (_req, res) => {
  try {
    const row = await knex('contacts').count('* as count').first();
    res.json({ status: 'ok', contacts: row ? row.count : 0, time: new Date().toISOString() });
  } catch (err) {
    res.json({ status: 'ok', contacts: 0, time: new Date().toISOString(), error: err.message });
  }
});

// --- Notifications table ---
sqliteDb.run(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data TEXT,
    role TEXT,
    user_id INTEGER,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Helper to create notification row
async function createNotification({ type, title, body, data = null, role = null, user_id = null }) {
  try {
    const dataStr = data ? JSON.stringify(data) : null;
    await knex('notifications').insert({ type, title, body, data: dataStr, role, user_id });
  } catch (e) {
    console.error('Failed to create notification', e);
  }
}

// Notifications API
app.get('/api/notifications', async (req, res) => {
  try {
    const role = req.query.role ? String(req.query.role) : null;
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);
    let rows;
    if (role) rows = await knex('notifications').where('role', role).orderBy('created_at', 'desc').limit(limit).offset(offset);
    else rows = await knex('notifications').orderBy('created_at', 'desc').limit(limit).offset(offset);
    const mapped = rows.map(r => ({ ...r, data: r.data ? JSON.parse(r.data) : null }));
    res.json({ success: true, notifications: mapped });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' });
    await knex('notifications').where('id', id).update({ read: 1 });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/notifications/read-all', async (req, res) => {
  try {
    const role = req.body.role ? String(req.body.role) : null;
    if (role) await knex('notifications').where('role', role).update({ read: 1 });
    else await knex('notifications').update({ read: 1 });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/notifications/unread-count', async (req, res) => {
  try {
    const role = req.query.role ? String(req.query.role) : null;
    let row;
    if (role) row = await knex('notifications').where({ role }).andWhere('read', 0).count({ count: '*' }).first();
    else row = await knex('notifications').where('read', 0).count({ count: '*' }).first();
    res.json({ success: true, count: row ? Number(row.count) : 0 });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- Date conversion proxy to Bolpatra (with local fallback) ---
app.get('/api/convert-date', async (req, res) => {
  try {
    const { date, to } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'date query param required (YYYY-MM-DD)' });
    const rawDate = String(date);
    // Try to proxy to Bolpatra openDateConverter (best-effort)
    const target = 'https://www.bolpatra.gov.np/egp/openDateConverter';
    let fetched = null;
    try {
      const url = new URL(target);
      // Attempt GET first with query param
      url.searchParams.set('date', rawDate);
      // some implementations expect a direction param 'to' but we'll include if provided
      if (to) url.searchParams.set('to', String(to));
      const r = await fetch(url.toString(), { method: 'GET' });
      const text = await r.text();
      fetched = text;
      // try to extract obvious BS/AD strings from HTML if present
      const nepaliMatch = text.match(/(\d{3,4}[-\/]\d{1,2}[-\/]\d{1,2})/);
      if (nepaliMatch) {
        // return best-effort
        return res.json({ success: true, source: 'bolpatra-get', raw: text, converted: nepaliMatch[0] });
      }
    } catch (err) {
      // ignore and fallback
      fetched = null;
    }

    // Fallback: provide a simple localized representation and Nepali numerals
    const dt = new Date(rawDate);
    if (Number.isNaN(dt.getTime())) return res.status(400).json({ success: false, error: 'invalid date' });
    const en = dt.toISOString().slice(0, 10);
    // produce a Nepali-looking date by using Nepali numerals and Nepali month names (approximate)
    const nepMonths = ['बैशाख','जेठ','आषाढ','श्रावण','भदौ','आश्विन','कार्तिक','मंसिर','पुष','माघ','फागुन','चैत'];
    const nepDay = dt.getDate();
    const nepMonth = nepMonths[dt.getMonth()];
    const nepYearApprox = dt.getFullYear(); // NOTE: not actual BS conversion – best-effort
    const nepaliDigits = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
    const toNepaliNumerals = (s) => String(s).split('').map(c => nepaliDigits[c] ?? c).join('');
    const nepaliDate = `${toNepaliNumerals(nepDay)} ${nepMonth} ${toNepaliNumerals(nepYearApprox)}`;
    return res.json({ success: true, source: fetched ? 'bolpatra-raw' : 'fallback', date: en, nepali: nepaliDate });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Contact API ---
const VALID_SUBJECTS = ['timur', 'herbs', 'daily', 'wholesale', 'inquiry'];

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !phone || !subject || !message) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  if (!VALID_SUBJECTS.includes(subject)) {
    return res.status(400).json({ success: false, error: 'Invalid subject category' });
  }

  try {
    const createdAt = new Date().toISOString();
    const inserted = await knex('contacts').insert({ name, email, phone, subject, message, createdAt });
    const insertedId = Array.isArray(inserted) ? inserted[0] : inserted;
    res.json({
      success: true,
      contact: {
        id: insertedId,
        name,
        email,
        phone,
        subject,
        message,
        createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/contacts', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const [adminEmail, adminPassword] = Buffer.from(token, 'base64').toString().split(':');

    const isValid = await verifyAdminCredentials(adminEmail, adminPassword);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    const contacts = await knex('contacts').orderBy('id', 'desc');
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- POS APIs (SQLite mirroring Cloudflare D1) ---

// Products
app.get('/api/pos/products', async (req, res) => {
  try {
    const products = await knex('products').select('*');
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pos/products', async (req, res) => {
  try {
    const { id, nameEn, nameNe, category, stock, unit, purchasePrice, sellingPrice, emoji, status } = req.body;
    sqliteDb.run(
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customerId INTEGER NOT NULL,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customerId) REFERENCES customers(id)
      )`
    );

    // Backfill missing customer detail columns for older databases
    ['customerName', 'customerPhone', 'customerEmail'].forEach((col) => {
      try {
        sqliteDb.run('ALTER TABLE orders ADD COLUMN ' + col + ' TEXT');
      } catch (err) {
        // ignore if the column already exists
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sales
app.get('/api/pos/sales', async (req, res) => {
  try {
    const rows = await knex('sales').orderBy('created_at', 'desc');
    const sales = rows.map(s => ({ ...s, items: s.items ? JSON.parse(s.items) : [] }));
    res.json({ success: true, sales });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pos/sales', async (req, res) => {
  try {
    const {
      id, items, subtotal, discount, tax, total, date, cashier, customerId, paymentMode,
      customerName, customerPhone, customerEmail, customerLoginId, customerAddress, customerPan,
      customerAlternativeAddress, customerAlternativePhone
    } = req.body;
    const itemsStr = typeof items === 'string' ? items : JSON.stringify(items);
    
    await knex('sales').insert({
      id: id.trim(), items: itemsStr, subtotal: Number(subtotal), discount: Number(discount || 0), tax: Number(tax || 0), total: Number(total), date: date.trim(), cashier: cashier.trim(), customerId: customerId ? String(customerId).trim() : null, paymentMode: paymentMode || 'Cash', customerName: customerName ? String(customerName).trim() : null, customerPhone: customerPhone ? String(customerPhone).trim() : null, customerEmail: customerEmail ? String(customerEmail).trim() : null, customerLoginId: customerLoginId ? String(customerLoginId).trim() : null, customerAddress: customerAddress ? String(customerAddress).trim() : null, customerPan: customerPan ? String(customerPan).trim() : null, customerAlternativeAddress: customerAlternativeAddress ? String(customerAlternativeAddress).trim() : null, customerAlternativePhone: customerAlternativePhone ? String(customerAlternativePhone).trim() : null
    });
    const sale = await knex('sales').where('id', id.trim()).first();
    sale.items = JSON.parse(sale.items);
    // Emit realtime sale notification
    try { io.emit('sale:new', sale); } catch (e) {}
    // persist notification
    try { await createNotification({ type: 'sale', title: `Sale ${sale.id}`, body: `Total ${sale.total}`, data: sale, role: 'admin' }); } catch (e) {}
    // Update product stock for each sold item and emit low-stock alerts
    try {
      const soldItems = Array.isArray(sale.items) ? sale.items : [];
      for (const it of soldItems) {
        const productId = (it.productId || it.id || it._id || it.product_id || it.product) && String(it.productId || it.id || it._id || it.product_id || it.product);
        const qty = Number(it.qty || it.quantity || it.qty_sold || it.q || 0);
        if (!productId || !qty) continue;
        // decrement stock
        await knex('products').where('id', productId).decrement('stock', qty);
        const p = await knex('products').select('id', 'nameEn', 'stock', 'minStock').where('id', productId).first();
        if (p && typeof p.stock === 'number') {
          const minS = Number(p.minStock || 0);
          if (minS > 0 && Number(p.stock) < minS) {
            try { io.to('role:admin').emit('stock:low', { productId: p.id, name: p.nameEn, stock: p.stock, minStock: minS }); } catch (e) {}
            try { await createNotification({ type: 'stock', title: `Low stock: ${p.nameEn}`, body: `Stock ${p.stock} < ${minS}`, data: { productId: p.id, stock: p.stock, minStock: minS }, role: 'admin' }); } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error('Error updating product stock after sale', e);
    }
    res.json({ success: true, sale });
      // Record ledger transaction
      const txnDate = date.trim();
      // Determine sign: if the payment is to a customer (e.g., refund), make amount negative
      const isCustomerTransaction = paymentMode && paymentMode.toLowerCase().includes('customer');
      const signedAmount = Number(total) * (isCustomerTransaction ? -1 : 1);
      if (paymentMode === 'Cash') {
        // Cash received: debit cash, credit sales (use signed amount)
        await knex('transactions').insert({ date: txnDate, entity_id: id.trim(), entity_type: 'sale', type: 'Sale', ref_no: id.trim(), debit: 0, credit: signedAmount, narration: `Cash sale ${id}` });
      } else {
        // Non‑cash payment (e.g., eSewa, Khalti, or customer refund)
        await knex('transactions').insert({ date: txnDate, entity_id: id.trim(), entity_type: 'sale', type: 'Sale', ref_no: id.trim(), debit: signedAmount, credit: 0, narration: `${paymentMode} sale ${id}` });
      }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Purchases
app.get('/api/pos/purchases', async (req, res) => {
  try {
    const rows = await knex('purchases').orderBy('created_at', 'desc');
    const purchases = rows.map(p => ({ ...p, items: p.items ? JSON.parse(p.items) : [] }));
    res.json({ success: true, purchases });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pos/purchases', async (req, res) => {
  try {
    const { id, supplier, items, total, date, paymentMode } = req.body;
    const itemsStr = typeof items === 'string' ? items : JSON.stringify(items);
    // record purchase transaction
    await knex('transactions').insert({ date: date.trim(), entity_id: id.trim(), entity_type: 'purchase', type: 'Purchase', ref_no: id.trim(), debit: 0, credit: total, narration: `Purchase ${id}` });
    // insert into purchases table
    await knex('purchases').insert({ id: id.trim(), supplier: supplier ? String(supplier).trim() : null, items: itemsStr, total: Number(total), date: date.trim(), paymentMode: paymentMode || 'Cash' }).onConflict('id').merge();
    // update product stock (increment)
    try {
      const purchasedItems = Array.isArray(items) ? items : JSON.parse(itemsStr || '[]');
      for (const it of purchasedItems) {
        const productId = (it.productId || it.id || it._id || it.product_id || it.product) && String(it.productId || it.id || it._id || it.product_id || it.product);
        const qty = Number(it.qty || it.quantity || it.q || 0);
        if (!productId || !qty) continue;
        await knex('products').where('id', productId).increment('stock', qty);
      }
    } catch (e) {
      console.error('Error updating product stock after purchase', e);
    }
    const purchase = await knex('purchases').where('id', id.trim()).first();
    purchase.items = purchase.items ? JSON.parse(purchase.items) : [];
    try { await createNotification({ type: 'purchase', title: `Purchase ${purchase.id}`, body: `Purchase ${purchase.id} recorded`, data: purchase, role: 'admin' }); } catch (e) {}
    res.json({ success: true, purchase });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Customers
app.get('/api/pos/customers', async (req, res) => {
  try {
    const rows = await knex('customers').orderBy('name', 'asc');
    const customers = rows.map(c => ({
      _id: String(c.id),
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      login_id: c.login_id || '',
      address: c.address || '',
      productToBuy: c.productToBuy || '',
      type: c.type || 'retail',
      password: c.password || c.phone || '12345',
      panNo: c.panNo || '',
      alternativeAddress: c.alternativeAddress || '',
      alternativePhone: c.alternativePhone || ''
    }));
    res.json({ success: true, customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- POS auth endpoints (Express) ---
app.post('/api/pos/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'Missing credentials' });
    const row = await knex('login').where('email', String(email).trim().toLowerCase()).first();
    if (!row) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const ok = verifyUserPassword(String(email).trim().toLowerCase(), String(password), row.password_hash || row.password);
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
    const payload = { id: row.id, email: row.email, role: row.role || 'cashier', display_name: row.display_name || '' };
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });
    res.json({ success: true, token, cashier: row.display_name || row.email, role: row.role || 'cashier' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// token validation endpoint used by POSLogin
app.get('/api/auth', async (req, res) => {
  try {
    const token = req.headers['x-pos-token'] || (req.headers.authorization && String(req.headers.authorization).startsWith('Bearer ') ? String(req.headers.authorization).slice(7) : null);
    if (!token) return res.status(401).json({ success: false, error: 'Missing token' });
    try {
      const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
      const payload = jwt.verify(String(token), secret);
      return res.json({ success: true, ...payload });
    } catch (e) { return res.status(401).json({ success: false, error: 'Invalid token' }); }
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Orders (local endpoint for quick customer orders)
app.get('/api/orders', async (req, res) => {
  try {
    const rows = await knex('orders').orderBy('created_at', 'desc');
    res.json({ success: true, orders: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Products endpoints (basic)
app.get('/api/products', async (req, res) => {
  try {
    const rows = await knex('products').select('id', 'nameEn', 'stock', 'unit', 'purchasePrice', 'sellingPrice', 'minStock').orderBy('nameEn', 'asc');
    res.json({ success: true, products: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const row = await knex('products').where('id', id).first();
    res.json({ success: true, product: row });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/products/:id/minstock', requirePosAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const id = String(req.params.id);
    const { minStock } = req.body || {};
    const num = Number(minStock || 0);
    await knex('products').where('id', id).update({ minStock: num });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Full CRUD for products
app.post('/api/products', requirePosAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const { id, nameEn, nameNe, category, stock, unit, purchasePrice, sellingPrice, emoji, minStock } = req.body || {};
    if (!id || !nameEn) return res.status(400).json({ success: false, error: 'id and nameEn required' });
    await knex('products').insert({ id: String(id), nameEn: String(nameEn), nameNe: String(nameNe || ''), category: String(category || ''), stock: Number(stock || 0), unit: String(unit || ''), purchasePrice: Number(purchasePrice || 0), sellingPrice: Number(sellingPrice || 0), emoji: String(emoji || '📦'), minStock: Number(minStock || 0) }).onConflict('id').merge();
    const p = await knex('products').where('id', String(id)).first();
    res.json({ success: true, product: p });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.put('/api/products/:id', requirePosAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const id = String(req.params.id);
    const patch = req.body || {};
    const keys = Object.keys(patch || {});
    if (!id) return res.status(400).json({ success: false, error: 'id required' });
    // build update
    const sets = [];
    const vals = [];
    for (const k of keys) {
      if (['nameEn','nameNe','category','stock','unit','purchasePrice','sellingPrice','emoji','minStock'].includes(k)) {
        sets.push(`${k} = ?`);
        vals.push(patch[k]);
      }
    }
    if (sets.length === 0) return res.status(400).json({ success: false, error: 'no updatable fields' });
    vals.push(id);
    await knex('products').where('id', id).update(Object.fromEntries(keys.filter(k=>['nameEn','nameNe','category','stock','unit','purchasePrice','sellingPrice','emoji','minStock'].includes(k)).map(k=>[k, patch[k]])));
    const p = await knex('products').where('id', id).first();
    res.json({ success: true, product: p });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.delete('/api/products/:id', requirePosAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const id = String(req.params.id);
    await knex('products').where('id', id).del();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Stock entries
// stock_entries table ensured by migrations

app.post('/api/stock', requirePosAuth, requireRole(['owner','admin','cashier']), async (req, res) => {
  try {
    const { id, productId, warehouseId, qty, type, date, note } = req.body || {};
    if (!id || !productId || !qty || !type) return res.status(400).json({ success: false, error: 'id, productId, qty, type required' });
    await knex('stock_entries').insert({ id: String(id), productId: String(productId), warehouseId: warehouseId ? String(warehouseId) : null, qty: Number(qty), type: String(type), date: String(date || new Date().toISOString()), note: note ? String(note) : null });
    // update product stock
    if (type === 'in') await knex('products').where('id', String(productId)).increment('stock', Number(qty));
    else await knex('products').where('id', String(productId)).decrement('stock', Number(qty));
    const entry = await knex('stock_entries').where('id', String(id)).first();
    res.json({ success: true, entry });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- Inventory auxiliary endpoints: categories, brands, warehouses, stock movements
app.get('/api/inventory/categories', async (req, res) => {
  try {
    const rows = await knex('inventory_categories').select('*').orderBy('name', 'asc');
    res.json({ success: true, categories: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/inventory/categories', requirePosAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const { id, name, description } = req.body || {};
    if (!id || !name) return res.status(400).json({ success: false, error: 'id and name required' });
    await knex('inventory_categories').insert({ id: String(id), name: String(name), description: String(description || '') }).onConflict('id').merge();
    const row = await knex('inventory_categories').where('id', String(id)).first();
    res.json({ success: true, category: row });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/inventory/brands', async (req, res) => {
  try { const rows = await knex('inventory_brands').select('*').orderBy('name','asc'); res.json({ success: true, brands: rows }); } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/inventory/brands', requirePosAuth, requireRole(['owner','admin']), async (req, res) => {
  try { const { id, name, description } = req.body || {}; if (!id||!name) return res.status(400).json({ success:false,error:'id and name required' }); await knex('inventory_brands').insert({ id:String(id), name:String(name), description:String(description||'') }).onConflict('id').merge(); const row = await knex('inventory_brands').where('id',String(id)).first(); res.json({ success:true, brand: row }); } catch (e) { res.status(500).json({ success:false,error:e.message }); }
});

app.get('/api/inventory/warehouses', async (req, res) => {
  try { const rows = await knex('warehouses').select('*').orderBy('name','asc'); res.json({ success:true, warehouses: rows }); } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

app.post('/api/inventory/warehouses', requirePosAuth, requireRole(['owner','admin']), async (req, res) => {
  try { const { id, name, location } = req.body || {}; if (!id||!name) return res.status(400).json({ success:false,error:'id and name required' }); await knex('warehouses').insert({ id:String(id), name:String(name), location:String(location||'') }).onConflict('id').merge(); const row = await knex('warehouses').where('id',String(id)).first(); res.json({ success:true, warehouse: row }); } catch (e) { res.status(500).json({ success:false,error:e.message }); }
});

// stock movements (higher-level than stock_entries)
app.post('/api/inventory/stock-movements', requirePosAuth, requireRole(['owner','admin','cashier']), async (req, res) => {
  try {
    const { id, productId, warehouseId, batchId, qty, type, note } = req.body || {};
    if (!id || !productId || !qty || !type) return res.status(400).json({ success: false, error: 'id, productId, qty, type required' });
    await knex('stock_movements').insert({ id: String(id), productId: String(productId), warehouseId: warehouseId ? String(warehouseId) : null, batchId: batchId ? String(batchId) : null, qty: Number(qty), type: String(type), note: note ? String(note) : null });
    // mirror to stock_entries for backward compatibility
    await knex('stock_entries').insert({ id: `sm-${id}`, productId: String(productId), warehouseId: warehouseId ? String(warehouseId) : null, qty: Number(qty), type: String(type), date: new Date().toISOString(), note: note ? String(note) : null }).catch(()=>{});
    // update product stock (same logic as /api/stock)
    if (type === 'in') await knex('products').where('id', String(productId)).increment('stock', Number(qty));
    else await knex('products').where('id', String(productId)).decrement('stock', Number(qty));
    // update per-warehouse stock if warehouseId provided
    if (warehouseId) {
      const wid = String(warehouseId);
      const wsId = `ws-${productId}-${wid}`;
      const delta = type === 'in' ? Number(qty) : -Number(qty);
      // try update existing row, else insert
      const updated = await knex('warehouse_stock').where('id', wsId).update({ qty: knex.raw('qty + ?', [delta]), updated_at: new Date().toISOString() }).catch(() => 0);
      if (!updated) {
        // ensure non-negative
        const baseQty = Math.max(0, delta);
        await knex('warehouse_stock').insert({ id: wsId, productId: String(productId), warehouseId: wid, qty: baseQty, updated_at: new Date().toISOString() }).catch(()=>{});
      }
    }
    const m = await knex('stock_movements').where('id', String(id)).first();
    // emit realtime event
    try { io.emit('stock:movement', m); } catch (e) {}
    // check low stock and notify
    try {
      const p = await knex('products').where('id', String(productId)).first();
      if (p && typeof p.stock !== 'undefined' && typeof p.minStock !== 'undefined' && Number(p.stock) < Number(p.minStock || 0)) {
        await createNotification({ type: 'stock_low', title: `Low stock: ${p.nameEn || p.id}`, body: `${p.nameEn || p.id} stock ${p.stock} below min ${p.minStock}`, data: p, role: 'admin' });
        try { io.emit('stock:low', p); } catch (e) {}
      }
    } catch (e) {}

    res.json({ success: true, movement: m });
  } catch (e) { res.status(500).json({ success:false, error: e.message }); }
});

// transfer between warehouses
app.post('/api/inventory/transfer', requirePosAuth, requireRole(['owner','admin','cashier']), async (req, res) => {
  try {
    const { id, productId, fromWarehouseId, toWarehouseId, qty, note } = req.body || {};
    if (!id || !productId || !fromWarehouseId || !toWarehouseId || !qty) return res.status(400).json({ success: false, error: 'id, productId, fromWarehouseId, toWarehouseId, qty required' });
    // create out movement
    const outId = `${id}-out`;
    await knex('stock_movements').insert({ id: outId, productId: String(productId), warehouseId: String(fromWarehouseId), qty: -Math.abs(Number(qty)), type: 'transfer_out', note: note ? String(note) : null, created_at: new Date().toISOString() });
    // create in movement
    const inId = `${id}-in`;
    await knex('stock_movements').insert({ id: inId, productId: String(productId), warehouseId: String(toWarehouseId), qty: Math.abs(Number(qty)), type: 'transfer_in', note: note ? String(note) : null, created_at: new Date().toISOString() });
    // mirror to stock_entries for compatibility
    await knex('stock_entries').insert({ id: `tr-${outId}`, productId: String(productId), warehouseId: String(fromWarehouseId), qty: Number(qty), type: 'out', date: new Date().toISOString(), note: `transfer-out ${note||''}` }).catch(()=>{});
    await knex('stock_entries').insert({ id: `tr-${inId}`, productId: String(productId), warehouseId: String(toWarehouseId), qty: Number(qty), type: 'in', date: new Date().toISOString(), note: `transfer-in ${note||''}` }).catch(()=>{});
    // update per-warehouse stock: decrement from source, increment at dest
    try {
      const wOutId = `ws-${productId}-${fromWarehouseId}`;
      const wInId = `ws-${productId}-${toWarehouseId}`;
      await knex('warehouse_stock').where('id', wOutId).update({ qty: knex.raw('qty - ?', [Number(qty)]), updated_at: new Date().toISOString() }).catch(()=>{});
      const updated = await knex('warehouse_stock').where('id', wInId).update({ qty: knex.raw('qty + ?', [Number(qty)]), updated_at: new Date().toISOString() }).catch(() => 0);
      if (!updated) await knex('warehouse_stock').insert({ id: wInId, productId: String(productId), warehouseId: String(toWarehouseId), qty: Number(qty), updated_at: new Date().toISOString() }).catch(()=>{});
    } catch (e) {}
    const movement = { id, productId, fromWarehouseId, toWarehouseId, qty, note };
    try { io.emit('stock:transfer', movement); } catch (e) {}
    res.json({ success: true, transfer: movement });
  } catch (e) { res.status(500).json({ success:false, error: e.message }); }
});

// Protected demo seeder for inventory (owner/admin)
app.post('/api/inventory/seed', requirePosAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    // insert sample categories, brands, warehouses, sample products and stock
    const now = new Date().toISOString();
    const categories = [ { id: 'cat-herbs', name: 'Herbs' }, { id: 'cat-food', name: 'Food' } ];
    for (const c of categories) await knex('inventory_categories').insert({ ...c, created_at: now }).onConflict('id').merge();
    const brands = [ { id: 'brand-dhaka', name: 'Dhakal' } ];
    for (const b of brands) await knex('inventory_brands').insert({ ...b, created_at: now }).onConflict('id').merge();
    const warehouses = [ { id: 'wh-main', name: 'Main Warehouse', location: 'Kathmandu' } ];
    for (const w of warehouses) await knex('warehouses').insert({ ...w, created_at: now }).onConflict('id').merge();
    // sample products
    const products = [ { id: 'p-herb-1', nameEn: 'Herb A', stock: 50, unit: 'kg', sellingPrice: 120, purchasePrice: 80, minStock: 10 }, { id: 'p-food-1', nameEn: 'Food X', stock: 200, unit: 'pcs', sellingPrice: 40, purchasePrice: 25, minStock: 20 } ];
    for (const p of products) await knex('products').insert({ id: p.id, nameEn: p.nameEn, nameNe: '', category: '', stock: p.stock, unit: p.unit, purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice, emoji: '📦', minStock: p.minStock }).onConflict('id').merge();
    // insert stock_entries for products
    for (const p of products) {
      const sid = `seed-${p.id}`;
      await knex('stock_entries').insert({ id: sid, productId: p.id, warehouseId: 'wh-main', qty: p.stock, type: 'in', date: now, note: 'seed' }).catch(()=>{});
      // set per-warehouse stock
      try {
        const wid = 'wh-main';
        const wsId = `ws-${p.id}-${wid}`;
        await knex('warehouse_stock').insert({ id: wsId, productId: p.id, warehouseId: wid, qty: p.stock, updated_at: now }).onConflict('id').merge();
      } catch (e) {}
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success:false, error: e.message }); }
});

// batches endpoints
app.get('/api/inventory/batches', async (req, res) => {
  try {
    const productId = req.query.productId ? String(req.query.productId) : null;
    let rows;
    if (productId) rows = await knex('batches').where('productId', productId).orderBy('expiry_date', 'asc');
    else rows = await knex('batches').orderBy('expiry_date', 'asc').limit(500);
    res.json({ success: true, batches: rows });
  } catch (e) { res.status(500).json({ success:false, error: e.message }); }
});

app.post('/api/inventory/batches', requirePosAuth, requireRole(['owner','admin','cashier']), async (req, res) => {
  try {
    const { id, productId, batch_no, qty, manufacture_date, expiry_date } = req.body || {};
    if (!id || !productId) return res.status(400).json({ success:false, error:'id and productId required' });
    await knex('batches').insert({ id: String(id), productId: String(productId), batch_no: batch_no ? String(batch_no) : null, qty: Number(qty || 0), manufacture_date: manufacture_date ? String(manufacture_date) : null, expiry_date: expiry_date ? String(expiry_date) : null }).onConflict('id').merge();
    const row = await knex('batches').where('id', String(id)).first();
    res.json({ success:true, batch: row });
  } catch (e) { res.status(500).json({ success:false, error: e.message }); }
});

// warehouse stock endpoints
app.get('/api/inventory/warehouse-stock', async (req, res) => {
  try {
    const productId = req.query.productId ? String(req.query.productId) : null;
    const warehouseId = req.query.warehouseId ? String(req.query.warehouseId) : null;
    let q = knex('warehouse_stock').select('*');
    if (productId) q = q.where('productId', productId);
    if (warehouseId) q = q.where('warehouseId', warehouseId);
    const rows = await q.orderBy('productId','asc');
    res.json({ success:true, rows });
  } catch (e) { res.status(500).json({ success:false, error: e.message }); }
});

app.post('/api/inventory/warehouse-stock', requirePosAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const { productId, warehouseId, qty } = req.body || {};
    if (!productId || !warehouseId) return res.status(400).json({ success:false, error:'productId and warehouseId required' });
    const id = `ws-${productId}-${warehouseId}`;
    await knex('warehouse_stock').insert({ id, productId: String(productId), warehouseId: String(warehouseId), qty: Number(qty || 0), updated_at: new Date().toISOString() }).onConflict('id').merge();
    const row = await knex('warehouse_stock').where('id', id).first();
    res.json({ success:true, row });
  } catch (e) { res.status(500).json({ success:false, error: e.message }); }
});

// scan for expiry within days (default 30) and create notifications
app.post('/api/inventory/check-expiry', requirePosAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const days = Number(req.body.days || 30);
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString();
    const rows = await knex('batches').whereNotNull('expiry_date').andWhere('expiry_date', '<=', cutoff).orderBy('expiry_date','asc');
    // create notifications for each soon-to-expire batch
    for (const b of rows) {
      try { await createNotification({ type: 'expiry', title: `Batch expiry ${b.batch_no || b.id}`, body: `Batch ${b.batch_no || b.id} for product ${b.productId} expires ${b.expiry_date}`, data: b, role: 'admin' }); } catch (e) {}
    }
    try { io.emit('stock:expiry', rows); } catch (e) {}
    res.json({ success:true, count: rows.length, batches: rows });
  } catch (e) { res.status(500).json({ success:false, error: e.message }); }
});

app.get('/api/stock', async (req, res) => {
  try {
    const productId = req.query.productId ? String(req.query.productId) : null;
    let rows;
    if (productId) rows = await knex('stock_entries').where('productId', productId).orderBy('created_at', 'desc');
    else rows = await knex('stock_entries').orderBy('created_at', 'desc').limit(500);
    res.json({ success: true, entries: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { id, productId, productName, qty, customerName, customerPhone, customerEmail, address, note, status } = req.body;
    if (!id || !productName || !qty) return res.status(400).json({ success: false, error: 'Required fields missing.' });

    // Create orders table if missing
    // orders table exists via migrations; insert order
    await knex('orders').insert({ id: id.trim(), productId: productId ? String(productId).trim() : null, productName: productName.trim(), qty: Number(qty), customerName: customerName ? String(customerName).trim() : null, customerPhone: customerPhone ? String(customerPhone).trim() : null, customerEmail: customerEmail ? String(customerEmail).trim() : null, address: address ? String(address).trim() : null, note: note ? String(note).trim() : null, status: status || 'pending' });
    const order = await knex('orders').where('id', id.trim()).first();
    // Emit realtime notification for new order
    try { io.emit('order:new', order); } catch (e) {}
    try { await createNotification({ type: 'order', title: `Order ${order.id}`, body: `Order ${order.id} created`, data: order, role: 'admin' }); } catch (e) {}
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pos/customers', async (req, res) => {
  try {
    const { _id, name, phone, email, login_id, address, productToBuy, type, password, panNo, alternativeAddress, alternativePhone } = req.body;
    if (_id) {
      const customerId = parseInt(_id);
      await knex('customers').where('id', customerId).update({ name: name.trim(), phone: phone.trim(), email: email ? email.trim() : null, login_id: login_id ? login_id.trim() : null, address: address ? address.trim() : null, productToBuy: productToBuy ? productToBuy.trim() : null, type: type || 'retail', password: password ? password.trim() : phone.trim(), panNo: panNo ? panNo.trim() : null, alternativeAddress: alternativeAddress ? alternativeAddress.trim() : null, alternativePhone: alternativePhone ? alternativePhone.trim() : null });
      const updated = await knex('customers').where('id', customerId).first();
      res.json({
        success: true,
        customer: {
          _id: String(updated.id),
          name: updated.name,
          phone: updated.phone,
          email: updated.email || '',
          login_id: updated.login_id || '',
          address: updated.address || '',
          productToBuy: updated.productToBuy || '',
          type: updated.type || 'retail',
          password: updated.password || '',
          panNo: updated.panNo || '',
          alternativeAddress: updated.alternativeAddress || '',
          alternativePhone: updated.alternativePhone || ''
        }
      });
    } else {
      const inserted = await knex('customers').insert({ name: name.trim(), phone: phone.trim(), email: email ? email.trim() : null, login_id: login_id ? login_id.trim() : null, address: address ? address.trim() : null, productToBuy: productToBuy ? productToBuy.trim() : null, type: type || 'retail', password: password ? password.trim() : phone.trim(), panNo: panNo ? panNo.trim() : null, alternativeAddress: alternativeAddress ? alternativeAddress.trim() : null, alternativePhone: alternativePhone ? alternativePhone.trim() : null });
      const createdId = Array.isArray(inserted) ? inserted[0] : inserted;
      const created = await knex('customers').where('id', createdId).first();
      res.json({
        success: true,
        customer: {
          _id: String(created.id),
          name: created.name,
          phone: created.phone,
          email: created.email || '',
          login_id: created.login_id || '',
          address: created.address || '',
          productToBuy: created.productToBuy || '',
          type: created.type || 'retail',
          password: created.password || '',
          panNo: created.panNo || '',
          alternativeAddress: created.alternativeAddress || '',
          alternativePhone: created.alternativePhone || ''
        }
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Users Auth & Management

app.post('/api/pos/auth/login', async (req, res) => {
  try {
    const email = normalizeLoginEmail(req.body?.email);
    const password = String(req.body?.password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = await knex('login').whereRaw('LOWER(email) = ?', [email]).first();
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials or inactive account.' });
    }

    const isValid = verifyUserPassword(email, password, user.password_hash || user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials or inactive account.' });
    }

    const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
    const token = jwt.sign(
      {
        id: String(user.id),
        email: user.email,
        name: user.display_name,
        role: user.role || 'cashier'
      },
      secret,
      { expiresIn: '7d' }
    );

    res.json({ success: true, cashier: user.display_name, role: user.role || 'cashier', token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/pos/users', async (req, res) => {
  try {
    const rows = await knex('login').select('id', 'email', 'display_name', 'role', 'phone', 'address', 'alternative_phone', 'bio', 'avatar', 'pan_no', 'profile_photo').orderBy('id', 'desc');
    const users = rows.map(u => ({
      _id: String(u.id),
      name: u.display_name,
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
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pos/users', async (req, res) => {
  try {
    const { _id, name, username, role, phone, password, address, alternativePhone, bio, avatar, panNo, profilePhoto } = req.body;
    if (_id) {
      const userId = parseInt(_id);
      const existing = await knex('login').where('id', userId).first();
      if (!existing) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const passwordHash = SHARED_LOGIN_PASSWORD_HASH;

      await knex('login').where('id', userId).update({ display_name: name.trim(), email: username.trim().toLowerCase(), role, phone: phone ? phone.trim() : null, password_hash: passwordHash, address: address ? address.trim() : null, alternative_phone: alternativePhone ? alternativePhone.trim() : null, bio: bio ? bio.trim() : null, avatar: avatar || '👤', pan_no: panNo ? panNo.trim() : null, profile_photo: profilePhoto ? profilePhoto.trim() : null });
      const updated = await knex('login').select('id', 'email', 'display_name', 'role', 'phone', 'address', 'alternative_phone', 'bio', 'avatar', 'pan_no', 'profile_photo').where('id', userId).first();
      res.json({
        success: true,
        user: {
          _id: String(updated.id),
          name: updated.display_name,
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
      const passwordHash = SHARED_LOGIN_PASSWORD_HASH;

      const inserted = await knex('login').insert({ display_name: name.trim(), email: username.trim().toLowerCase(), role, phone: phone ? phone.trim() : null, password_hash: passwordHash, address: address ? address.trim() : null, alternative_phone: alternativePhone ? alternativePhone.trim() : null, bio: bio ? bio.trim() : null, avatar: avatar || '👤', pan_no: panNo ? panNo.trim() : null, profile_photo: profilePhoto ? profilePhoto.trim() : null });
      const createdId = Array.isArray(inserted) ? inserted[0] : inserted;
      const created = await knex('login').select('id', 'email', 'display_name', 'role', 'phone', 'address', 'alternative_phone', 'bio', 'avatar', 'pan_no', 'profile_photo').where('id', createdId).first();
      res.json({
        success: true,
        user: {
          _id: String(created.id),
          name: created.display_name,
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
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/pos/users/:id', async (req, res) => {
  try {
    await knex('login').where('id', parseInt(req.params.id)).del();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

// --- Socket.io ---
io.on('connection', (socket) => {
  console.log('New client connected', socket.id);
  
  socket.on('join_chat', (customerId) => {
    socket.join(`chat_${customerId}`);
  });

  socket.on('join_admin', () => {
    socket.join('admin');
  });

  socket.on('send_message', async (data) => {
    const { customerId, sender, message } = data;
    try {
      const inserted = await knex('chats').insert({ customerId, sender, message });
      const chatId = Array.isArray(inserted) ? inserted[0] : inserted;
      io.to(`chat_${customerId}`).emit('receive_message', {
          id: chatId,
          customerId,
          sender,
          message,
          timestamp: new Date().toISOString()
        });
      // Also broadcast to admin room
      io.to('admin').emit('receive_message', {
        id: chatId,
        customerId,
        sender,
        message,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Socket message error', err);
    }
  });

  socket.on('join_admin', () => {
    socket.join('admin');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

// --- Customer Auth APIs ---
app.post('/api/customer/register', async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Name, phone, and password are required' });
  }
  const login_id = normalizeLoginEmail(email || phone);
  try {
    const loginHash = customerPasswordHash(password, login_id);
    const insertedLogin = await knex('login').insert({ email: login_id.trim().toLowerCase(), display_name: name.trim(), role: 'customer', phone: phone.trim(), password_hash: loginHash });
    const loginRowId = Array.isArray(insertedLogin) ? insertedLogin[0] : insertedLogin;
    const insertedCustomer = await knex('customers').insert({ login_id: loginRowId, name: name.trim(), phone: phone.trim(), email: email ? email.trim() : null });
    const customerId = Array.isArray(insertedCustomer) ? insertedCustomer[0] : insertedCustomer;
    res.json({ success: true, customerId, name, login_id, customer: { id: customerId, name: name.trim(), phone: phone.trim(), email: email ? email.trim() : '', login_id: login_id.trim() } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Registration failed. Login ID might exist.' });
  }
});

app.post('/api/customer/login', async (req, res) => {
  const { login_id, password } = req.body;
  try {
    const canonicalLoginId = normalizeLoginEmail(login_id);
    const loginRow = await knex('login').where({ role: 'customer' }).andWhere(function () {
      this.whereRaw('LOWER(email) = LOWER(?)', [canonicalLoginId]).orWhere('phone', login_id);
    }).first();
    if (!loginRow) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const canonicalLoginIdForHash = normalizeLoginEmail(loginRow.email || loginRow.phone || canonicalLoginId);
    const providedHash = customerPasswordHash(password, canonicalLoginIdForHash);
    if (String(loginRow.password_hash || '') !== providedHash) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const customer = await knex('customers').where('login_id', loginRow.id).first();
    res.json({ success: true, customer: { id: customer?.id || loginRow.id, name: customer?.name || loginRow.display_name || '', phone: customer?.phone || loginRow.phone || '', email: customer?.email || loginRow.email || '', login_id: loginRow.email || loginRow.phone || login_id, role: loginRow.role } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Customer Shop & Orders APIs ---
app.get('/api/customer/products', async (req, res) => {
  try {
    const products = await knex('products').select('id', 'nameEn', 'nameNe', 'category', 'sellingPrice', 'unit', 'emoji').where('status', 'active').andWhere('stock', '>', 0);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/customer/orders', async (req, res) => {
  const { customerId, customerName, customerPhone, customerEmail, items, total } = req.body;
  try {
    const orderId = `ORD-${Date.now()}`;
    // orders schema exists via migrations; directly insert
    await knex('orders').insert({ id: orderId, customerId, customerName: customerName || null, customerPhone: customerPhone || null, customerEmail: customerEmail || null, items: JSON.stringify(items), total, date: new Date().toISOString() });
    res.json({ success: true, orderId, order: { id: orderId, customerId, customerName, customerPhone, customerEmail, items, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/customer/orders/:customerId', async (req, res) => {
  try {
    const orders = await knex('orders').where('customerId', req.params.customerId).orderBy('created_at', 'desc');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Chat APIs ---
app.get('/api/chats/:customerId', async (req, res) => {
  try {
    const chats = await knex('chats').where('customerId', req.params.customerId).orderBy('timestamp', 'asc');
    res.json({ success: true, chats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    const { customerId, sender, message } = req.body;
    if (!customerId || !sender || !message) {
      return res.status(400).json({ success: false, error: 'CustomerId, sender and message are required.' });
    }

    const inserted = await knex('chats').insert({ customerId: String(customerId), sender: String(sender), message: String(message) });
    const chatId = Array.isArray(inserted) ? inserted[0] : inserted;
    const chat = await knex('chats').where('id', chatId).first();
    res.json({
      success: true,
      chat: {
        id: chat.id,
        customerId: String(chat.customerId),
        sender: chat.sender,
        message: chat.message,
        timestamp: chat.timestamp,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/chats', async (req, res) => {
  try {
    const [chats, customers] = await Promise.all([
      knex('chats').orderBy('timestamp', 'desc').limit(200),
      knex('customers').select('id', 'name', 'login_id', 'phone', 'email')
    ]);

    const customerLookup = new Map();
    customers.forEach((c) => {
      customerLookup.set(String(c.id), c);
      if (c.login_id) customerLookup.set(String(c.login_id), c);
      if (c.phone) customerLookup.set(String(c.phone), c);
      if (c.email) customerLookup.set(String(c.email).toLowerCase(), c);
    });

    const grouped = chats.reduce((acc, chat) => {
      const key = String(chat.customerId);
      const customer = customerLookup.get(key) || customerLookup.get(key.toLowerCase());
      const customerName = customer?.name || `Customer ${chat.customerId}`;
      if (!acc[key]) acc[key] = { customerId: chat.customerId, customerName, messages: [] };
      acc[key].messages.push(chat);
      return acc;
    }, {});

    Object.values(grouped).forEach(g => g.messages.reverse());
    res.json({ success: true, chats: Object.values(grouped) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Dhakal Traders API running at http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Database: ${ADMIN_DB_FILE}`);
  });
} else {
  // When running tests, do not auto-listen. Tests will start the server on an ephemeral port.
  console.log('Dhakal Traders API running in test mode — http server not auto-listening');
}

// Export app and server objects for tests and other tooling
export { app, httpServer, io, knex };
