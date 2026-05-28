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
import minioClient from './utils/minioClient.js';
import uploadRoutes from './uploadRoutes.js';
import reprocessRoutes from './reprocessRoutes.js';
import { deleteMinioObjectIfExists, parseMinioObjectRef } from './utils/minioStorage.js';

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

function resolveProductImageUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\//i.test(raw)) return raw;
  if (/^\/api\/product-image\b/i.test(raw)) return raw;

  let bucket = 'images';
  let objectName = raw;

  if (/^https?:\/\//i.test(raw) || /^\/\//.test(raw)) {
    try {
      const url = new URL(raw.startsWith('//') ? `http:${raw}` : raw);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        bucket = parts.shift();
        objectName = parts.join('/');
      }
    } catch {
      objectName = raw;
    }
  } else {
    objectName = raw.replace(/^\/+/, '').replace(/^images\//i, '');
  }

  if (!objectName) return '';
  return `/api/product-image?bucket=${encodeURIComponent(bucket)}&name=${encodeURIComponent(objectName)}`;
}

async function resolveExistingProductImageUrl(value) {
  const url = resolveProductImageUrl(value);
  if (!url || !/^\/api\/product-image\b/i.test(url)) return url;

  try {
    const parsed = new URL(url, 'http://localhost');
    const bucket = parsed.searchParams.get('bucket') || 'images';
    const objectName = parsed.searchParams.get('name') || '';
    if (!objectName) return '';
    await minioClient.statObject(bucket, objectName);
    return url;
  } catch {
    return '';
  }
}

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
        { email: 'admin@dhakaltraders.com', display_name: 'Cashier Admin', role: 'admin', phone: '9857823400', password_hash: SHARED_LOGIN_PASSWORD_HASH },
        { email: 'owner@dhakaltraders.com', display_name: 'Dipak Sharma', role: 'owner', phone: '9857823400', password_hash: SHARED_LOGIN_PASSWORD_HASH },
        { email: 'cashier@dhakaltraders.com', display_name: 'Ram Bahadur', role: 'cashier', phone: '9847000000', password_hash: SHARED_LOGIN_PASSWORD_HASH },
        { email: 'nabin@dhakaltraders.com', display_name: 'Nabin Dhakal', role: 'cashier', phone: '9869596970', password_hash: SHARED_LOGIN_PASSWORD_HASH },
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
    const hasSaleStatus = await knex.schema.hasColumn('sales', 'status').catch(() => false);
    if (!hasSaleStatus) await knex.schema.table('sales', (t) => t.string('status').defaultTo('completed')).catch(() => {});

    // Ensure sales.invoice_no is unique to prevent duplicate invoice numbers
    try { await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoice_no ON sales(invoice_no)'); } catch (e) { /* ignore */ }

    // invoice counters table for generating sequential invoice numbers
    const hasInvoiceCounters = await knex.schema.hasTable('invoice_counters').catch(() => false);
    if (!hasInvoiceCounters) {
      await knex.schema.createTable('invoice_counters', (t) => {
        t.string('name').primary();
        t.integer('seq').notNullable().defaultTo(0);
      }).catch(() => {});
      try { await knex('invoice_counters').insert({ name: 'sales', seq: 0 }).catch(() => {}); } catch (e) {}
    }

    const hasProductImageUrl = await knex.schema.hasColumn('products', 'imageUrl').catch(() => false);
    if (!hasProductImageUrl) await knex.schema.table('products', (t) => t.string('imageUrl')).catch(() => {});
    const hasProductCategory = await knex.schema.hasColumn('products', 'category').catch(() => false);
    if (!hasProductCategory) await knex.schema.table('products', (t) => t.string('category').defaultTo('')).catch(() => {});

    // Core accounting accounts used by normalized POS journal postings.
    const coreAccounts = [
      ['1200', 'Accounts Receivable', 'Asset'],
      ['2100', 'VAT Payable', 'Liability'],
      ['5000', 'Cost of Goods Sold', 'Expense'],
      ['1300', 'Inventory', 'Asset'],
    ];
    for (const [code, name, type] of coreAccounts) {
      const existing = await knex('accounts').where('account_code', code).first().catch(() => null);
      if (!existing) {
        await knex('accounts').insert({ account_code: code, account_name: name, account_type: type, parent_account_id: null, opening_balance: 0, current_balance: 0 }).catch(() => {});
      }
    }

    // Login table extra columns
    // Ensure display_name exists (some older DBs used `name`)
    const hasDisplayName = await knex.schema.hasColumn('login', 'display_name').catch(() => false);
    if (!hasDisplayName) {
      await knex.schema.table('login', (t) => t.string('display_name')).catch(() => {});
      const hasNameCol = await knex.schema.hasColumn('login', 'name').catch(() => false);
      if (hasNameCol) {
        // copy existing `name` values into `display_name`
        await knex.raw("UPDATE login SET display_name = name WHERE display_name IS NULL").catch(() => {});
      }
    }

    const loginExtraCols = ['address','alternative_phone','bio','avatar','pan_no','profile_photo'];
    for (const col of loginExtraCols) {
      const has = await knex.schema.hasColumn('login', col).catch(() => false);
      if (!has) await knex.schema.table('login', (t) => t.string(col)).catch(() => {});
    }

    await ensureLoginIndexes();
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
const ALLOWED_LOGIN_ROLES = new Set(['admin', 'owner', 'cashier', 'supplier', 'customer']);
const STAFF_LOGIN_ROLES = new Set(['admin', 'owner', 'cashier']);
const normalizeLoginRole = (role) => String(role || '').trim().toLowerCase();
const isAllowedLoginRole = (role) => ALLOWED_LOGIN_ROLES.has(normalizeLoginRole(role));
const isStaffLoginRole = (role) => STAFF_LOGIN_ROLES.has(normalizeLoginRole(role));

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

async function ensureLoginIndexes() {
  try {
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS idx_login_email_lower ON login(LOWER(email))');
  } catch (e) {
    console.warn('Unable to ensure login email index', e.message);
  }
  try {
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_login_role ON login(role)');
  } catch (e) {
    console.warn('Unable to ensure login role index', e.message);
  }
  try {
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS idx_login_email_lower ON login(LOWER(email))');
  } catch (e) {
    console.warn('Unable to ensure login email index', e.message);
  }
}

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
app.disable('x-powered-by');
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://[::1]:5173', 'http://[::1]:5174'],
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
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://[::1]:5173', 'http://[::1]:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
// Simple request/response logger to help diagnose 500s in dev
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});
// Allow larger JSON/urlencoded bodies for client requests (profile updates may include larger payloads)
app.use(express.json({ limit: process.env.EXPRESS_JSON_LIMIT || '5mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.EXPRESS_URLENCODED_LIMIT || '5mb' }));

const rateLimitBuckets = new Map();
function createRateLimiter({ windowMs = 60_000, max = 60, keyPrefix = 'global' }) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
    const now = Date.now();
    let bucket = rateLimitBuckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
    }
    bucket.count = (bucket.count || 0) + 1;
    rateLimitBuckets.set(key, bucket);
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
    }
    return next();
  };

}
// --- QR image from MinIO (for receipts / billing preview) ---
app.get('/api/qr-image', async (req, res) => {
  try {
    const bucket = String(req.query.bucket || process.env.MINIO_QR_BUCKET || 'images');
    const objectName = String(req.query.object || process.env.MINIO_QR_OBJECT || 'downloaded-image.png');

    const presignedUrl = await minioClient.presignedGetObject(bucket, objectName, 60 * 60);
    return res.redirect(presignedUrl);
  } catch (err) {
    console.warn('MinIO QR image unavailable — returning tiny placeholder image. Error:', err?.message || err);
    // Return a 1x1 transparent PNG as a safe placeholder so image tags won't trigger additional 500s
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    const buf = Buffer.from(pngBase64, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buf.length);
    return res.end(buf);
  }
});

// Global error handler to log unexpected errors and return JSON
app.use((err, req, res, next) => {
  try {
    console.error('Unhandled server error:', err && err.stack ? err.stack : err);
  } catch (e) {}
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.use('/api', uploadRoutes);
app.use('/api', reprocessRoutes);

app.get('/api/product-image', async (req, res) => {
  try {
    const bucket = String(req.query.bucket || 'images').trim();
    const name = String(req.query.name || req.query.path || '').trim();
    if (!bucket || !name) {
      return res.status(400).json({ success: false, error: 'bucket and name are required' });
    }

    const stat = await minioClient.statObject(bucket, name).catch(() => null);
    if (!stat) {
      const escapedName = String(name)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      const placeholderSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240" role="img" aria-label="Image unavailable">
          <defs>
            <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="#f7f7f7" />
              <stop offset="100%" stop-color="#eceff4" />
            </linearGradient>
          </defs>
          <rect width="320" height="240" rx="18" fill="url(#g)" />
          <rect x="36" y="28" width="248" height="160" rx="14" fill="#ffffff" stroke="#d9e2ef" />
          <circle cx="120" cy="88" r="20" fill="#d4dbea" />
          <path d="M72 168l48-48 34 34 24-24 72 72H72z" fill="#c8d2e3" />
          <text x="160" y="214" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="15" fill="#68758a">Image unavailable</text>
          <text x="160" y="44" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#8a96a8">${escapedName}</text>
        </svg>`;
      const buf = Buffer.from(placeholderSvg, 'utf8');
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Content-Length', buf.length);
      return res.status(200).end(buf);
    }
    const contentType = stat?.metaData?.['content-type'] || stat?.metaData?.['Content-Type'] || 'image/jpeg';

    const stream = await new Promise((resolve, reject) => {
      minioClient.getObject(bucket, name, (err, dataStream) => {
        if (err) return reject(err);
        resolve(dataStream);
      });
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
        res.status(200).end(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><rect width="320" height="240" rx="18" fill="#f3f4f6"/><text x="160" y="122" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#6b7280">Image unavailable</text></svg>`, 'utf8'));
      }
    });
    stream.pipe(res);
  } catch (err) {
    const fallback = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><rect width="320" height="240" rx="18" fill="#f3f4f6"/><text x="160" y="122" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#6b7280">Image unavailable</text></svg>`, 'utf8');
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Length', fallback.length);
    res.status(200).end(fallback);
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
    const cached = schemaCache.notifications;
    const hasRoleCol = cached ? cached.hasRole : await knex.schema.hasColumn('notifications', 'role').catch(() => false);
    const hasReadCol = cached ? cached.hasRead : await knex.schema.hasColumn('notifications', 'read').catch(() => false);
    const readCol = hasReadCol ? 'read' : null;
    if (role && hasRoleCol && readCol) {
      row = await knex('notifications').where({ role }).andWhere(readCol, 0).count({ count: '*' }).first();
    } else if (readCol) {
      row = await knex('notifications').where(readCol, 0).count({ count: '*' }).first();
    } else {
      // Table exists but missing expected columns — return zero rather than error
      row = { count: 0 };
    }
    res.json({ success: true, count: row ? Number(row.count) : 0 });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Client-side diagnostic ingestion endpoint
app.post('/api/diagnostics/client-failure', async (req, res) => {
  try {
    const payload = req.body || {};
    const { url, resourceType, page } = payload;
    console.log('[client-diagnostic]', { url, resourceType, page, ua: req.headers['user-agent'] });
    // Try to persist to client_logs if table exists
    const hasClientLogs = await knex.schema.hasTable('client_logs').catch(() => false);
    if (hasClientLogs) {
      try {
        await knex('client_logs').insert({ url: url ? String(url).slice(0, 2000) : null, resource_type: resourceType ? String(resourceType).slice(0,200) : null, page: page ? String(page).slice(0,500) : null, user_agent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0,2000) : null, payload: JSON.stringify(payload) });
      } catch (e) {
        console.warn('client_logs insert failed', e.message || e);
      }
    }
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// --- Date conversion proxy to Bolpatra (with local fallback) ---
app.get('/api/convert-date', async (req, res) => {
  try {
    const { date, to } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'date query param required (YYYY-MM-DD or BS format)' });
    const rawDate = String(date);

    // Try to use a dedicated Nepali date conversion library if available to provide accurate AD<->BS conversion.
    // This uses a best-effort dynamic import so the server still runs when the package is not installed.
    try {
      const lib = await import('nepali-date-converter').catch(() => null);
      const mod = lib && (lib.default || lib) ? (lib.default || lib) : null;
      if (mod) {
        // detect common API shapes and use them
        if (String(to).toLowerCase() === 'nepali' || String(to).toLowerCase() === 'bs') {
          if (typeof mod.ad2bs === 'function') {
            const out = mod.ad2bs(rawDate);
            return res.json({ success: true, source: 'nepali-date-converter', date: rawDate, nepali: out });
          }
          if (typeof mod.toBS === 'function') {
            const out = mod.toBS(new Date(rawDate));
            return res.json({ success: true, source: 'nepali-date-converter', date: rawDate, nepali: out });
          }
        }
        // BS to AD
        if (String(to).toLowerCase() === 'gregorian' || String(to).toLowerCase() === 'ad') {
          if (typeof mod.bs2ad === 'function') {
            const out = mod.bs2ad(rawDate);
            return res.json({ success: true, source: 'nepali-date-converter', date: rawDate, gregorian: out });
          }
          if (typeof mod.toAD === 'function') {
            const out = mod.toAD(rawDate);
            return res.json({ success: true, source: 'nepali-date-converter', date: rawDate, gregorian: out });
          }
        }
      }
    } catch (libErr) {
      // library not available or failed — fallthrough to fallback implementation
    }

    // Fallback behavior (existing): attempt Bolpatra proxy then localized display
    const target = 'https://www.bolpatra.gov.np/egp/openDateConverter';
    let fetched = null;
    try {
      const url = new URL(target);
      url.searchParams.set('date', rawDate);
      if (to) url.searchParams.set('to', String(to));
      const r = await fetch(url.toString(), { method: 'GET' });
      const text = await r.text();
      fetched = text;
      const nepaliMatch = text.match(/(\d{3,4}[-\/]\d{1,2}[-\/]\d{1,2})/);
      if (nepaliMatch) return res.json({ success: true, source: 'bolpatra-get', raw: text, converted: nepaliMatch[0] });
    } catch (err) {
      fetched = null;
    }

    const dt = new Date(rawDate);
    if (Number.isNaN(dt.getTime())) return res.status(400).json({ success: false, error: 'invalid date' });
    const en = dt.toISOString().slice(0, 10);
    const nepMonths = ['बैशाख','जेठ','आषाढ','श्रावण','भदौ','आश्विन','कार्तिक','मंसिर','पुष','माघ','फागुन','चैत'];
    const nepDay = dt.getDate();
    const nepMonth = nepMonths[dt.getMonth()];
    const nepYearApprox = dt.getFullYear();
    const nepaliDigits = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
    const toNepaliNumerals = (s) => String(s).split('').map(c => nepaliDigits[c] ?? c).join('');
    const nepaliDate = `${toNepaliNumerals(nepDay)} ${nepMonth} ${toNepaliNumerals(nepYearApprox)}`;
    // If the conversion library wasn't installed, inform the caller how to enable accurate conversion
    const hint = 'For accurate AD<->BS conversion install a Nepali date library (e.g. `npm i nepali-date-converter`) and restart the server.';
    return res.json({ success: true, source: fetched ? 'bolpatra-raw' : 'fallback', date: en, nepali: nepaliDate, hint });
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
    const products = await knex('products as p')
      .leftJoin('categories as c', 'p.category_id', 'c.id')
      .leftJoin('units as u', 'p.unit_id', 'u.id')
      .leftJoin(
        knex('product_stock')
          .select('product_id')
          .sum({ stock: 'quantity' })
          .groupBy('product_id')
          .as('ps'),
        'p.id',
        'ps.product_id'
      )
      .select(
        'p.id',
        'p.barcode',
        'p.name_en as nameEn',
        'p.name_ne as nameNe',
        'p.purchase_price as purchasePrice',
        'p.selling_price as sellingPrice',
        'p.min_stock as minStock',
        'p.image',
        'p.imageUrl',
        'p.expiry_date as expiryDate',
        'p.status',
        'p.login_id as loginId',
        'c.category_name as category',
        'u.unit_name as unitName',
        'u.short_name as unitShort',
        knex.raw('COALESCE(ps.stock, 0) as stock')
      )
      .orderBy('p.created_at', 'desc');

    const mapped = products.map((p) => ({
      id: p.id,
      barcode: p.barcode || '',
      nameEn: p.nameEn,
      nameNe: p.nameNe || '',
      category: p.category || '',
      stock: Number(p.stock || 0),
      unit: p.unitShort || p.unitName || '',
      purchasePrice: Number(p.purchasePrice || 0),
      sellingPrice: Number(p.sellingPrice || 0),
      emoji: '📦',
      status: p.status || 'active',
      expiryDate: p.expiryDate || '',
      minStock: Number(p.minStock || 0),
      image: p.image || '',
      imageUrl: resolveProductImageUrl(p.imageUrl || p.image || ''),
      loginId: p.loginId ? String(p.loginId) : '',
    }));
    res.json({ success: true, products: mapped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pos/products', async (req, res) => {
  try {
    const { id, nameEn, nameNe, category, stock, unit, purchasePrice, sellingPrice, emoji, status, imageUrl } = req.body || {};
    if (!id || !nameEn) {
      return res.status(400).json({ success: false, error: 'Product id and name are required.' });
    }

    const categoryRow = category ? await knex('categories').whereRaw('LOWER(category_name) = ?', [String(category).trim().toLowerCase()]).first() : null;
    const unitRow = unit ? await knex('units').whereRaw('LOWER(short_name) = ? OR LOWER(unit_name) = ?', [String(unit).trim().toLowerCase(), String(unit).trim().toLowerCase()]).first() : null;

    await knex('products').insert({
      id: String(id).trim(),
      barcode: null,
      name_en: String(nameEn).trim(),
      name_ne: nameNe ? String(nameNe).trim() : null,
      category_id: categoryRow ? categoryRow.id : null,
      brand_id: null,
      unit_id: unitRow ? unitRow.id : null,
      purchase_price: Number(purchasePrice || 0),
      selling_price: Number(sellingPrice || 0),
      tax_percent: 13,
      min_stock: 0,
      image: emoji || null,
      imageUrl: imageUrl ? String(imageUrl) : null,
      expiry_date: null,
      status: status || 'active',
      login_id: null,
    }).onConflict('id').merge();

    if (stock !== undefined) {
      const qty = Number(stock || 0);
      const existingStock = await knex('product_stock').where({ product_id: String(id).trim(), warehouse_id: 1 }).first();
      if (existingStock) {
        await knex('product_stock').where({ id: existingStock.id }).update({ quantity: qty });
      } else {
        await knex('product_stock').insert({ warehouse_id: 1, product_id: String(id).trim(), quantity: qty });
      }
    }

    const created = await knex('products as p')
      .leftJoin('categories as c', 'p.category_id', 'c.id')
      .leftJoin('units as u', 'p.unit_id', 'u.id')
      .leftJoin(
        knex('product_stock').select('product_id').sum({ stock: 'quantity' }).groupBy('product_id').as('ps'),
        'p.id',
        'ps.product_id'
      )
      .select('p.*', 'c.category_name as category', 'u.short_name as unitShort', knex.raw('COALESCE(ps.stock, 0) as stock'))
      .where('p.id', String(id).trim())
      .first();

    res.json({
      success: true,
      product: {
        id: created.id,
        nameEn: created.name_en,
        nameNe: created.name_ne || '',
        category: created.category || '',
        stock: Number(created.stock || 0),
        unit: created.unitShort || '',
        purchasePrice: Number(created.purchase_price || 0),
        sellingPrice: Number(created.selling_price || 0),
        emoji: created.image || '📦',
        imageUrl: created.imageUrl || '',
        status: created.status || 'active',
      }
    });
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
      id,
      items = [],
      subtotal,
      discount,
      tax,
      total,
      amountPaid,
      amountDue,
      date,
      cashier,
      customerId,
      paymentMode,
      customerName,
      customerPhone,
      customerEmail,
      customerLoginId,
      customerAddress,
      customerPan,
      customerAlternativeAddress,
      customerAlternativePhone,
      note,
      warehouseId,
      status,
    } = req.body || {};

    if (!date || !cashier) {
      return res.status(400).json({ success: false, error: 'Sale date and cashier are required.' });
    }

    const saleItems = Array.isArray(items) ? items : [];
    const billDate = String(date).slice(0, 10) || new Date().toISOString().slice(0, 10);
    const customerNameValue = String(customerName || '').trim();
    const cashierLookup = await knex('login')
      .whereRaw('LOWER(email) = ? OR LOWER(username) = ? OR LOWER(full_name) = ?', [String(cashier).trim().toLowerCase(), String(cashier).trim().toLowerCase(), String(cashier).trim().toLowerCase()])
      .first();

    let resolvedCustomerId = customerId ? parseInt(customerId, 10) : null;
    if (!resolvedCustomerId && customerNameValue) {
      const existingCustomer = await knex('customers').whereRaw('LOWER(full_name) = ?', [customerNameValue.toLowerCase()]).first();
      if (existingCustomer) {
        resolvedCustomerId = existingCustomer.id;
      } else {
        const insertedCustomer = await knex('customers').insert({
          full_name: customerNameValue,
          phone: customerPhone ? String(customerPhone).trim() : null,
          email: customerEmail ? String(customerEmail).trim() : null,
          address: customerAddress ? String(customerAddress).trim() : null,
          pan_no: customerPan ? String(customerPan).trim() : null,
          login_id: customerLoginId ? Number.isNaN(Number(customerLoginId)) ? null : Number(customerLoginId) : null,
          loyalty_points: 0,
          opening_balance: 0,
        });
        resolvedCustomerId = Array.isArray(insertedCustomer) ? insertedCustomer[0] : insertedCustomer;
      }
    }

    const saleAmount = Number(total || 0);
    const saleSubtotal = Number(subtotal || saleAmount);
    const saleDiscount = Number(discount || 0);
    const saleTax = Number(tax || 0);
    const salePaid = Number(amountPaid ?? saleAmount);
    const saleDue = Number(amountDue ?? Math.max(0, saleAmount - salePaid));
    const saleQty = saleItems.reduce((sum, it) => sum + Number(it.qty || it.quantity || 0), 0);
    const saleStatus = String(status || 'completed').trim().toLowerCase();
    const shouldAdjustStock = !['pending', 'cancelled'].includes(saleStatus);

    const saleInsert = {
      invoice_no: id ? String(id).trim() : null,
      customer_id: resolvedCustomerId,
      login_id: cashierLookup ? cashierLookup.id : null,
      warehouse_id: warehouseId ? Number(warehouseId) : 1,
      bill_date: billDate,
      miti: null,
      payment_mode: paymentMode || 'Cash',
      gross_amount: saleSubtotal + saleDiscount,
      discount_amount: saleDiscount,
      taxable_amount: saleSubtotal,
      vat_amount: saleTax,
      net_amount: saleAmount,
      paid_amount: salePaid,
      due_amount: saleDue,
      tender_amount: salePaid,
      change_amount: Math.max(0, salePaid - saleAmount),
      total_qty: saleQty,
      loyalty_point_earned: 0,
      loyalty_total_points: 0,
      note: note || null,
      status: saleStatus || 'completed',
    };

    // Perform sale insert into normalized tables (invoices, invoice_items, payments, stock_movements, journal) inside a DB transaction
    let invoicePkId;
    try {
      await knex.transaction(async (trx) => {
        // Ensure invoice number exists; if not provided, generate a sequential invoice atomically
        if (!saleInsert.invoice_no) {
          let counter = await trx('invoice_counters').where('name', 'sales').first();
          if (!counter) {
            await trx('invoice_counters').insert({ name: 'sales', seq: 1 });
            counter = { name: 'sales', seq: 1 };
          } else {
            const newSeq = Number(counter.seq || 0) + 1;
            await trx('invoice_counters').where('name', 'sales').update({ seq: newSeq });
            counter.seq = newSeq;
          }
          const seqStr = String(counter.seq).padStart(4, '0');
          saleInsert.invoice_no = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${seqStr}`;
        }

        // Insert into invoices (normalized)
        const invoicePayload = {
          invoice_no: saleInsert.invoice_no,
          customer_id: saleInsert.customer_id,
          login_id: saleInsert.login_id,
          warehouse_id: saleInsert.warehouse_id,
          bill_date: saleInsert.bill_date,
          miti: saleInsert.miti || null,
          payment_mode: saleInsert.payment_mode,
          gross_amount: saleInsert.gross_amount,
          discount_amount: saleInsert.discount_amount,
          taxable_amount: saleInsert.taxable_amount,
          vat_amount: saleInsert.vat_amount,
          net_amount: saleInsert.net_amount,
          paid_amount: saleInsert.paid_amount,
          due_amount: saleInsert.due_amount,
          tender_amount: saleInsert.tender_amount,
          change_amount: saleInsert.change_amount,
          total_qty: saleInsert.total_qty,
          loyalty_point_earned: saleInsert.loyalty_point_earned,
          loyalty_total_points: saleInsert.loyalty_total_points,
          note: saleInsert.note,
          created_at: knex.fn.now(),
        };

        const insertedInvoice = await trx('invoices').insert(invoicePayload);
        invoicePkId = Array.isArray(insertedInvoice) ? insertedInvoice[0] : insertedInvoice;

        // Insert invoice items and stock movements
        for (const it of saleItems) {
          const productId = String(it.productId || it.id || it._id || it.product_id || it.product || '').trim();
          if (!productId) continue;
          const qty = Number(it.qty || it.quantity || 0);
          const rate = Number(it.rate || 0);
          const amount = Number(it.total || qty * rate);
          const product = await trx('products').where('id', productId).first();

          await trx('invoice_items').insert({
            invoice_id: invoicePkId,
            product_id: productId,
            product_name: String(it.name || it.productName || product?.name_en || product?.nameEn || productId),
            hs_code: it.hs_code || it.hsCode || null,
            qty,
            rate,
            discount: Number(it.discount || 0),
            vat_percent: Number(it.vat_percent || it.vatPercent || 13),
            vat_amount: Number(it.vat_amount || it.vatAmount || 0),
            amount,
            batch_no: it.batch_no || it.batchNo || null,
            expiry_date: it.expiry_date || it.expiryDate || null,
          });

          if (shouldAdjustStock) {
            // decrement earliest product_stock rows (FIFO-like)
            let remaining = qty;
            const stocks = await trx('product_stock').where('product_id', productId).orderBy('id', 'asc');
            for (const srow of stocks) {
              if (remaining <= 0) break;
              const available = Number(srow.quantity || 0);
              if (available <= 0) continue;
              const take = Math.min(available, remaining);
              await trx('product_stock').where('id', srow.id).decrement('quantity', take);
              remaining -= take;
            }

            // Record stock movement
            await trx('stock_movements').insert({
              product_id: productId,
              movement_type: 'sale',
              reference_id: invoicePkId,
              qty_in: 0,
              qty_out: qty,
              balance_qty: 0,
              movement_date: knex.fn.now(),
            });
          }
        }

        // Insert payment record(s)
          if (Number(salePaid) > 0) {
            // map payment columns to actual DB schema (some DBs use different column names)
            const payCols = await trx('payments').columnInfo().catch(() => ({}));
            const pick = (a, b, c, d) => (payCols[a] ? a : (payCols[b] ? b : (payCols[c] ? c : (payCols[d] ? d : null))));
            const invoiceRefCol = pick('invoice_id', 'sale_id', 'bill_id', 'receipt_id');
            const methodCol = pick('payment_method', 'payment_mode', 'method');
            const paidCol = pick('paid_amount', 'amount', 'paid');
            const tenderCol = pick('tender_amount', 'tender', 'tender_amt');
            const returnCol = pick('return_amount', 'change_amount', 'return_amt');
            const txnCol = pick('transaction_no', 'txn_no', 'transaction_id');
            const dateCol = pick('payment_date', 'created_at', 'date');

            const paymentPayload = {};
            if (invoiceRefCol) paymentPayload[invoiceRefCol] = invoicePkId;
            if (methodCol) paymentPayload[methodCol] = saleInsert.payment_mode || 'Cash';
            if (paidCol) paymentPayload[paidCol] = Number(salePaid || 0);
            if (tenderCol) paymentPayload[tenderCol] = Number(saleInsert.tender_amount || salePaid || 0);
            if (returnCol) paymentPayload[returnCol] = 0;
            if (txnCol) paymentPayload[txnCol] = null;
            if (dateCol) paymentPayload[dateCol] = knex.fn.now();

            // if no known columns found, fall back to generic insert (may fail)
            if (Object.keys(paymentPayload).length === 0) {
              await trx('payments').insert({ invoice_id: invoicePkId, payment_method: saleInsert.payment_mode || 'Cash', paid_amount: Number(salePaid || 0), tender_amount: Number(saleInsert.tender_amount || salePaid || 0), return_amount: 0, transaction_no: null, payment_date: knex.fn.now() });
            } else {
              await trx('payments').insert(paymentPayload);
            }
          }

        // Balanced journal entry: debit received cash/bank + receivable, credit taxable sales + VAT payable.
        // We only post journals for completed/stock-adjusting sales so drafts don't pollute the ledger.
        if (shouldAdjustStock) {
          try {
            const cashAcct = await trx('accounts').where('account_code', '1000').first();
            const bankAcct = await trx('accounts').where('account_code', '1100').first();
            const arAcct = await trx('accounts').where('account_code', '1200').first();
            const vatAcct = await trx('accounts').where('account_code', '2100').first();
            const salesAcct = await trx('accounts').where('account_code', '3000').first();

            const netCashReceived = Math.max(0, Number(saleInsert.paid_amount || 0) - Number(saleInsert.change_amount || 0));
            const dueBalance = Math.max(0, Number(saleInsert.due_amount || 0));
            const taxableSale = Number(saleInsert.taxable_amount || 0);
            const vatSale = Number(saleInsert.vat_amount || 0);

            const journalLines = [];
            const paymentAcct = String(saleInsert.payment_mode || 'Cash').toLowerCase().includes('bank') ? bankAcct : cashAcct;
            if (netCashReceived > 0 && paymentAcct) {
              journalLines.push({ side: 'debit', account_id: paymentAcct.id, amount: netCashReceived, description: `Payment received for ${saleInsert.invoice_no}` });
            }
            if (dueBalance > 0 && arAcct) {
              journalLines.push({ side: 'debit', account_id: arAcct.id, amount: dueBalance, description: `Receivable for ${saleInsert.invoice_no}` });
            }
            if (taxableSale > 0 && salesAcct) {
              journalLines.push({ side: 'credit', account_id: salesAcct.id, amount: taxableSale, description: `Sales revenue ${saleInsert.invoice_no}` });
            }
            if (vatSale > 0 && vatAcct) {
              journalLines.push({ side: 'credit', account_id: vatAcct.id, amount: vatSale, description: `VAT payable ${saleInsert.invoice_no}` });
            }

            const debitTotal = journalLines.filter((l) => l.side === 'debit').reduce((sum, l) => sum + Number(l.amount || 0), 0);
            const creditTotal = journalLines.filter((l) => l.side === 'credit').reduce((sum, l) => sum + Number(l.amount || 0), 0);
            const diff = Math.abs(debitTotal - creditTotal);
            if (diff > 0.01) {
              throw new Error(`Balanced journal posting required but debits (${debitTotal.toFixed(2)}) and credits (${creditTotal.toFixed(2)}) differ for invoice ${saleInsert.invoice_no}`);
            }

            if (journalLines.length > 0) {
              const voucherNo = `JV-${saleInsert.invoice_no}`;
              const [voucherId] = await trx('journal_vouchers').insert({ voucher_no: voucherNo, voucher_date: saleInsert.bill_date || knex.fn.now(), narration: `Sale ${saleInsert.invoice_no}`, reference_no: saleInsert.invoice_no, login_id: saleInsert.login_id || null, created_at: knex.fn.now() });
              for (const line of journalLines) {
                await trx('journal_entries').insert({ voucher_id: voucherId, account_id: line.account_id, debit: line.side === 'debit' ? Number(line.amount || 0) : 0, credit: line.side === 'credit' ? Number(line.amount || 0) : 0, description: line.description });
              }
            }
          } catch (jeErr) {
            console.warn('journal entry failed', jeErr?.message || jeErr);
            throw jeErr;
          }
        }

        // For backward compatibility, also insert into legacy 'sales' + 'sale_items' tables so GET /api/pos/sales continues to work
        try {
          const legacySale = { ...saleInsert };
          legacySale.items = JSON.stringify(saleItems.map(it => ({ productId: it.productId || it.id || it.product_id || it.product, name: it.name || it.productName, qty: it.qty || it.quantity || 0, rate: it.rate || 0, total: it.total || 0 })));
          const insertedLegacy = await trx('sales').insert(legacySale).catch((e) => { throw e; });
          const legacyId = Array.isArray(insertedLegacy) ? insertedLegacy[0] : insertedLegacy;
          // also insert legacy sale_items for compatibility (best-effort)
          for (const it of saleItems) {
            try {
              const productId = String(it.productId || it.id || it._id || it.product_id || it.product || '').trim();
              if (!productId) continue;
              const qty = Number(it.qty || it.quantity || 0);
              const rate = Number(it.rate || 0);
              const amount = Number(it.total || qty * rate);
              await trx('sale_items').insert({ sale_id: legacyId, product_id: productId, product_name: it.name || it.productName || productId, hs_code: it.hs_code || null, qty, rate, discount: Number(it.discount || 0), vat_percent: Number(it.vat_percent || it.vatPercent || 13), vat_amount: Number(it.vat_amount || it.vatAmount || 0), amount, batch_no: it.batch_no || null, expiry_date: it.expiry_date || null });
            } catch (siErr) {
              console.warn('legacy sale_items insert failed (ignored):', siErr?.message || siErr);
            }
          }
        } catch (legacyErr) {
          // legacy schema mismatch is tolerated; log and continue so normalized flow still succeeds
          console.warn('legacy sales insert failed (ignored):', legacyErr?.message || legacyErr);
        }
      });
    } catch (txErr) {
      return res.status(500).json({ success: false, error: txErr.message || String(txErr) });
    }

    // Read back inserted rows for response (outside transaction)
    const saleRow = await knex('invoices').where('id', invoicePkId).first().catch(() => null) || await knex('sales').where('id', invoicePkId).first();
    const saleItemsRows = await knex('invoice_items').where('invoice_id', invoicePkId).orderBy('id', 'asc').catch(() => []) || await knex('sale_items').where('sale_id', invoicePkId).orderBy('id', 'asc');
    const customerRow = resolvedCustomerId ? await knex('customers').where('id', resolvedCustomerId).first() : null;
    const responseSale = {
      id: saleRow?.invoice_no || saleInsert.invoice_no,
      invoice_no: saleRow?.invoice_no || saleInsert.invoice_no,
      customerId: saleRow?.customer_id ? String(saleRow.customer_id) : '',
      customerName: customerRow?.full_name || customerNameValue || 'Walk-in',
      customerPhone: customerRow?.phone || customerPhone || '',
      customerEmail: customerRow?.email || customerEmail || '',
      customerLoginId: customerRow?.login_id ? String(customerRow.login_id) : (customerLoginId || ''),
      customerAddress: customerRow?.address || customerAddress || '',
      customerPan: customerRow?.pan_no || customerPan || '',
      customerAlternativeAddress: customerAlternativeAddress || '',
      customerAlternativePhone: customerAlternativePhone || '',
      items: saleItemsRows.map((si) => ({
        productId: si.product_id,
        name: si.product_name,
        qty: Number(si.qty),
        unit: '',
        rate: Number(si.rate),
        total: Number(si.amount),
        cost: 0,
      })),
      subtotal: Number(saleRow?.taxable_amount || saleSubtotal),
      discount: Number(saleRow?.discount_amount || 0),
      tax: Number(saleRow?.vat_amount || 0),
      total: Number(saleRow?.net_amount || saleAmount),
      amountPaid: Number(saleRow?.paid_amount || salePaid),
      amountDue: Number(saleRow?.due_amount || saleDue),
      date: saleRow?.bill_date,
      cashier: cashierLookup?.full_name || cashier,
      paymentMode: saleRow?.payment_mode || paymentMode || 'Cash',
      status: saleRow?.status || saleStatus || 'completed',
      note: saleRow?.note || note || '',
    };

    try { io.emit('sale:new', responseSale); } catch (e) {}
    try { await createNotification({ type: 'sale', title: `Sale ${responseSale.id}`, body: `Total ${responseSale.total}`, data: responseSale, role: 'admin' }); } catch (e) {}

    res.json({ success: true, sale: responseSale });
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
    const { id, supplier, farmerName, productName, qtyKg, rate, total, date, paymentMode, items, note, warehouseId } = req.body || {};
    if (!id || !date) {
      return res.status(400).json({ success: false, error: 'Purchase id and date are required.' });
    }

    const purchaseItems = Array.isArray(items) && items.length > 0
      ? items
      : [{ productName: productName || 'Item', qtyKg: qtyKg || 0, rate: rate || 0, total: total || 0 }];

    const supplierName = String(supplier || farmerName || '').trim();
    let supplierRow = null;
    if (supplierName) {
      supplierRow = await knex('suppliers').whereRaw('LOWER(supplier_name) = ?', [supplierName.toLowerCase()]).first();
      if (!supplierRow) {
        const insertedSupplier = await knex('suppliers').insert({ supplier_name: supplierName, opening_balance: 0, phone: null, email: null, address: null, pan_no: null, login_id: null });
        const supplierPk = Array.isArray(insertedSupplier) ? insertedSupplier[0] : insertedSupplier;
        supplierRow = await knex('suppliers').where('id', supplierPk).first();
      }
    }

    const purchaseDate = String(date).slice(0, 10) || new Date().toISOString().slice(0, 10);
    const purchaseTotal = Number(total || 0);
    const purchaseInsert = {
      bill_no: String(id).trim(),
      supplier_id: supplierRow ? supplierRow.id : null,
      login_id: null,
      warehouse_id: warehouseId ? Number(warehouseId) : 1,
      purchase_date: purchaseDate,
      payment_mode: paymentMode || 'Cash',
      gross_amount: purchaseTotal,
      discount_amount: 0,
      taxable_amount: purchaseTotal,
      vat_amount: 0,
      net_amount: purchaseTotal,
      paid_amount: purchaseTotal,
      due_amount: 0,
      note: note || null,
    };

    const insertedPurchase = await knex('purchases').insert(purchaseInsert);
    const purchasePkId = Array.isArray(insertedPurchase) ? insertedPurchase[0] : insertedPurchase;

    for (const it of purchaseItems) {
      const productNameValue = String(it.productName || it.product_name || 'Item').trim();
      const qty = Number(it.qtyKg || it.qty || it.quantity || 0);
      const rateValue = Number(it.rate || 0);
      const amount = Number(it.total || (qty * rateValue));
      let product = await knex('products').whereRaw('LOWER(name_en) = ?', [productNameValue.toLowerCase()]).first();
      if (!product) {
        const productId = `PRD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        await knex('products').insert({ id: productId, barcode: null, name_en: productNameValue, name_ne: null, category_id: null, brand_id: null, unit_id: null, purchase_price: rateValue, selling_price: rateValue, tax_percent: 13, min_stock: 0, image: null, expiry_date: null, status: 'active', login_id: null });
        product = await knex('products').where('id', productId).first();
      }

      await knex('purchase_items').insert({
        purchase_id: purchasePkId,
        product_id: product.id,
        product_name: product.name_en,
        qty,
        rate: rateValue,
        discount: Number(it.discount || 0),
        vat_percent: Number(it.vat_percent || it.vatPercent || 13),
        vat_amount: Number(it.vat_amount || it.vatAmount || 0),
        amount,
        batch_no: it.batch_no || it.batchNo || null,
        expiry_date: it.expiry_date || it.expiryDate || null,
      });

      const stockRow = await knex('product_stock').where('product_id', product.id).orderBy('id', 'asc').first();
      if (stockRow) {
        await knex('product_stock').where('id', stockRow.id).increment('quantity', qty);
      } else {
        await knex('product_stock').insert({ warehouse_id: 1, product_id: product.id, quantity: qty });
      }
    }

    const purchaseRow = await knex('purchases').where('id', purchasePkId).first();
    const purchaseItemsRows = await knex('purchase_items').where('purchase_id', purchasePkId).orderBy('id', 'asc');
    const responsePurchase = {
      id: purchaseRow.bill_no,
      bill_no: purchaseRow.bill_no,
      supplierId: purchaseRow.supplier_id ? String(purchaseRow.supplier_id) : '',
      farmerName: supplierRow?.supplier_name || supplierName || '',
      productName: purchaseItemsRows[0]?.product_name || productName || '',
      qtyKg: Number(purchaseItemsRows.reduce((sum, row) => sum + Number(row.qty || 0), 0)),
      rate: Number(purchaseItemsRows[0]?.rate || rate || 0),
      total: Number(purchaseRow.net_amount || purchaseTotal),
      date: purchaseRow.purchase_date,
      paymentMode: purchaseRow.payment_mode || paymentMode || 'Cash',
      items: purchaseItemsRows.map((row) => ({
        productId: row.product_id,
        productName: row.product_name,
        qtyKg: Number(row.qty),
        rate: Number(row.rate),
        total: Number(row.amount),
      })),
      note: purchaseRow.note || note || '',
    };

    try { await createNotification({ type: 'purchase', title: `Purchase ${responsePurchase.id}`, body: `Purchase ${responsePurchase.id} recorded`, data: responsePurchase, role: 'admin' }); } catch (e) {}
    res.json({ success: true, purchase: responsePurchase });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Customers
app.get('/api/pos/customers', async (req, res) => {
  try {
    const rows = await knex('customers').orderBy('full_name', 'asc');
    const customers = rows.map(c => ({
      _id: String(c.id),
      id: String(c.id),
      name: c.full_name,
      full_name: c.full_name,
      phone: c.phone || '',
      email: c.email || '',
      login_id: c.login_id ? String(c.login_id) : '',
      address: c.address || '',
      panNo: c.pan_no || '',
      pan_no: c.pan_no || '',
      loyalty_points: Number(c.loyalty_points || 0),
      opening_balance: Number(c.opening_balance || 0),
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
    const rows = await knex('products')
      .select(
        'id',
        'name_en as nameEn',
        knex.raw('0 as stock'),
        'unit_id as unit',
        'purchase_price as purchasePrice',
        'selling_price as sellingPrice',
        'min_stock as minStock',
        'imageUrl',
        'image'
      )
      .orderBy('name_en', 'asc');
    res.json({
      success: true,
      products: await Promise.all(rows.map(async (p) => ({
        ...p,
        imageUrl: await resolveExistingProductImageUrl(p.imageUrl || p.image || ''),
      }))),
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const row = await knex('products').where('id', id).first();
    res.json({
      success: true,
      product: row ? {
        ...row,
        imageUrl: await resolveExistingProductImageUrl(row.imageUrl || row.image || ''),
      } : null,
    });
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
    const { id, nameEn, nameNe, category, stock, unit, purchasePrice, sellingPrice, emoji, minStock, imageUrl } = req.body || {};
    if (!id || !(nameEn || nameEn === '')) return res.status(400).json({ success: false, error: 'id and nameEn required' });

    // map to actual DB columns (some DBs use snake_case while others use camelCase)
    const cols = await knex('products').columnInfo().catch(() => ({}));
    const hasCol = (a, b) => (cols[a] ? a : (cols[b] ? b : null));

    const idCol = hasCol('id', 'id') || 'id';
    const nameEnCol = hasCol('nameEn', 'name_en') || 'nameEn';
    const nameNeCol = hasCol('nameNe', 'name_ne') || 'nameNe';
    const purchasePriceCol = hasCol('purchasePrice', 'purchase_price') || 'purchasePrice';
    const sellingPriceCol = hasCol('sellingPrice', 'selling_price') || 'sellingPrice';
    const minStockCol = hasCol('minStock', 'min_stock');
    const imageUrlCol = hasCol('imageUrl', 'image_url');
    const categoryCol = hasCol('category', 'category');
    const emojiCol = hasCol('emoji', 'emoji');

    const payload = {};
    payload[idCol] = String(id);
    payload[nameEnCol] = String(nameEn);
    payload[nameNeCol] = String(nameNe || '');
    if (cols['stock'] !== undefined) payload['stock'] = Number(stock || 0);
    if (cols['unit'] !== undefined) payload['unit'] = String(unit || '');
    if (purchasePriceCol) payload[purchasePriceCol] = Number(purchasePrice || 0);
    if (sellingPriceCol) payload[sellingPriceCol] = Number(sellingPrice || 0);
    if (minStockCol) payload[minStockCol] = Number(minStock || 0);
    if (categoryCol) payload[categoryCol] = String(category || '');
    if (imageUrlCol) payload[imageUrlCol] = String(imageUrl || '');
    if (emojiCol) payload[emojiCol] = String(emoji || '📦');

    await knex('products').insert(payload).onConflict('id').merge();
    const p = await knex('products').where(idCol, String(id)).first();
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
      if (['nameEn','nameNe','category','stock','unit','purchasePrice','sellingPrice','emoji','minStock','imageUrl'].includes(k)) {
        sets.push(`${k} = ?`);
        vals.push(patch[k]);
      }
    }
    if (sets.length === 0) return res.status(400).json({ success: false, error: 'no updatable fields' });
    vals.push(id);
    const existing = await knex('products').where('id', id).first();
    const cols = await knex('products').columnInfo().catch(() => ({}));
    const mapCol = (a, b) => (cols[a] ? a : (cols[b] ? b : null));
    const nameEnCol = mapCol('nameEn', 'name_en') || 'nameEn';
    const nameNeCol = mapCol('nameNe', 'name_ne') || 'nameNe';
    const purchasePriceCol = mapCol('purchasePrice', 'purchase_price') || 'purchasePrice';
    const sellingPriceCol = mapCol('sellingPrice', 'selling_price') || 'sellingPrice';
    const minStockCol = mapCol('minStock', 'min_stock');
    const imageUrlCol = mapCol('imageUrl', 'image_url');
    const categoryCol = mapCol('category', 'category');
    const emojiCol = mapCol('emoji', 'emoji');

    const updatePayload = {};
    for (const k of keys) {
      if (k === 'nameEn' && nameEnCol) updatePayload[nameEnCol] = patch[k];
      if (k === 'nameNe' && nameNeCol) updatePayload[nameNeCol] = patch[k];
      if (k === 'category' && categoryCol) updatePayload[categoryCol] = patch[k];
      if (k === 'stock' && cols['stock'] !== undefined) updatePayload['stock'] = patch[k];
      if (k === 'unit' && cols['unit'] !== undefined) updatePayload['unit'] = patch[k];
      if (k === 'purchasePrice' && purchasePriceCol) updatePayload[purchasePriceCol] = patch[k];
      if (k === 'sellingPrice' && sellingPriceCol) updatePayload[sellingPriceCol] = patch[k];
      if (k === 'emoji' && emojiCol) updatePayload[emojiCol] = patch[k];
      if (k === 'minStock' && minStockCol) updatePayload[minStockCol] = patch[k];
      if (k === 'imageUrl' && imageUrlCol) updatePayload[imageUrlCol] = patch[k];
    }
    await knex('products').where('id', id).update(updatePayload);
    const p = await knex('products').where('id', id).first();
    const previousImage = parseMinioObjectRef(existing?.imageUrl || existing?.image || '');
    const nextImage = parseMinioObjectRef(p?.imageUrl || p?.image || '');
    if (previousImage && nextImage && (previousImage.bucket !== nextImage.bucket || previousImage.objectName !== nextImage.objectName)) {
      await deleteMinioObjectIfExists(existing?.imageUrl || existing?.image || '');
    }
    res.json({ success: true, product: p });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.delete('/api/products/:id', requirePosAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const id = String(req.params.id);
    const existing = await knex('products').where('id', id).first();
    await knex('products').where('id', id).del();
    await deleteMinioObjectIfExists(existing?.imageUrl || existing?.image || '');
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Stock entries
// stock_entries table ensured by migrations

app.post('/api/stock', requirePosAuth, requireRole(['owner','admin','cashier']), async (req, res) => {
  try {
    const { id, productId, warehouseId, qty, type, date, note } = req.body || {};
    if (!id || !productId || !qty || !type) return res.status(400).json({ success: false, error: 'id, productId, qty, type required' });
    // insert stock entry (map columns if DB uses snake_case)
    const stockEntryCols = await knex('stock_entries').columnInfo().catch(() => ({}));
    const stockPayload = {};
    stockPayload[ stockEntryCols['id'] ? 'id' : (stockEntryCols['entry_id'] ? 'entry_id' : 'id') ] = String(id);
    if (stockEntryCols['productId']) stockPayload['productId'] = String(productId);
    else if (stockEntryCols['product_id']) stockPayload['product_id'] = String(productId);
    if (stockEntryCols['warehouseId']) stockPayload['warehouseId'] = warehouseId ? String(warehouseId) : null;
    else if (stockEntryCols['warehouse_id']) stockPayload['warehouse_id'] = warehouseId ? String(warehouseId) : null;
    const qtyColName = stockEntryCols['qty'] ? 'qty' : (stockEntryCols['quantity'] ? 'quantity' : null);
    if (qtyColName) stockPayload[qtyColName] = Number(qty);
    stockPayload[ stockEntryCols['type'] ? 'type' : (stockEntryCols['movement_type'] ? 'movement_type' : 'type') ] = String(type);
    stockPayload[ stockEntryCols['date'] ? 'date' : (stockEntryCols['movement_date'] ? 'movement_date' : 'date') ] = String(date || new Date().toISOString());
    if (stockEntryCols['note']) stockPayload['note'] = note ? String(note) : null;
    await knex('stock_entries').insert(stockPayload);

    // update product stock: many schemas don't have `products.stock`; prefer recording in `product_stock` table
    const psCols = await knex('product_stock').columnInfo().catch(() => ({}));
    const psQtyCol = psCols['quantity'] ? 'quantity' : (psCols['qty'] ? 'qty' : null);
    if (type === 'in') {
      // insert a product_stock row (best-effort)
      const psPayload = {};
      if (psCols['product_id']) psPayload['product_id'] = String(productId);
      else if (psCols['productId']) psPayload['productId'] = String(productId);
      if (psQtyCol) psPayload[psQtyCol] = Number(qty);
      if (psCols['warehouse_id'] && warehouseId) psPayload['warehouse_id'] = String(warehouseId);
      if (Object.keys(psPayload).length > 0) {
        try { await knex('product_stock').insert(psPayload); } catch (e) { /* ignore best-effort */ }
      }
    } else {
      // decrement earliest product_stock rows (FIFO-like)
      try {
        let remaining = Number(qty);
        const stocks = await knex('product_stock').where(psCols['product_id'] ? 'product_id' : 'productId', String(productId)).orderBy('id', 'asc');
        for (const srow of stocks) {
          if (remaining <= 0) break;
          const available = Number(srow[psQtyCol] || srow.quantity || srow.qty || 0);
          if (available <= 0) continue;
          const take = Math.min(available, remaining);
          if (psQtyCol) await knex('product_stock').where('id', srow.id).decrement(psQtyCol, take);
          remaining -= take;
        }
      } catch (e) { /* best-effort */ }
    }
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
    const { _id, id, name, full_name, phone, email, login_id, address, panNo, pan_no, loyalty_points, opening_balance } = req.body;
    const customerName = String(full_name || name || '').trim();
    const customerPan = String(pan_no || panNo || '').trim() || null;
    const loginIdValue = login_id !== undefined && login_id !== null && String(login_id).trim() !== '' ? String(login_id).trim() : null;

    if (!_id && !id && !customerName && !String(phone || '').trim()) {
      return res.status(400).json({ success: false, error: 'Name and phone are required.' });
    }

    if (_id) {
      const customerId = parseInt(_id);
      await knex('customers').where('id', customerId).update({
        full_name: customerName || undefined,
        phone: phone ? String(phone).trim() : undefined,
        email: email ? String(email).trim() : null,
        login_id: loginIdValue,
        address: address ? String(address).trim() : null,
        pan_no: customerPan,
        loyalty_points: loyalty_points !== undefined ? Number(loyalty_points || 0) : undefined,
        opening_balance: opening_balance !== undefined ? Number(opening_balance || 0) : undefined,
      });
      const updated = await knex('customers').where('id', customerId).first();
      res.json({
        success: true,
        customer: {
          _id: String(updated.id),
          id: String(updated.id),
          name: updated.full_name,
          full_name: updated.full_name,
          phone: updated.phone,
          email: updated.email || '',
          login_id: updated.login_id ? String(updated.login_id) : '',
          address: updated.address || '',
          panNo: updated.pan_no || '',
          pan_no: updated.pan_no || '',
          loyalty_points: Number(updated.loyalty_points || 0),
          opening_balance: Number(updated.opening_balance || 0),
        }
      });
    } else {
      const inserted = await knex('customers').insert({
        full_name: customerName,
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        login_id: loginIdValue,
        address: address ? String(address).trim() : null,
        pan_no: customerPan,
        loyalty_points: loyalty_points !== undefined ? Number(loyalty_points || 0) : 0,
        opening_balance: opening_balance !== undefined ? Number(opening_balance || 0) : 0,
      });
      const createdId = Array.isArray(inserted) ? inserted[0] : inserted;
      const created = await knex('customers').where('id', createdId).first();
      res.json({
        success: true,
        customer: {
          _id: String(created.id),
          id: String(created.id),
          name: created.full_name,
          full_name: created.full_name,
          phone: created.phone,
          email: created.email || '',
          login_id: created.login_id ? String(created.login_id) : '',
          address: created.address || '',
          panNo: created.pan_no || '',
          pan_no: created.pan_no || '',
          loyalty_points: Number(created.loyalty_points || 0),
          opening_balance: Number(created.opening_balance || 0),
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
    const safeName = String(name || '').trim();
    const safeUsername = normalizeLoginEmail(username);
    const safeRole = normalizeLoginRole(role);
    const safePhone = String(phone || '').trim();
    const safePassword = String(password || '').trim();

    if (!safeName || !safeUsername || !isAllowedLoginRole(safeRole)) {
      return res.status(400).json({ success: false, error: 'Valid name, email, and role are required.' });
    }

    const existingByEmail = await knex('login')
      .whereRaw('LOWER(email) = LOWER(?)', [safeUsername])
      .andWhere(function () {
        if (_id) this.whereNot('id', parseInt(_id));
      })
      .first();

    if (existingByEmail) {
      return res.status(409).json({ success: false, error: 'A user with this email already exists.' });
    }

    const resolvedPasswordHash = isStaffLoginRole(safeRole)
      ? SHARED_LOGIN_PASSWORD_HASH
      : (safePassword ? customerPasswordHash(safePassword, safeUsername) : null);

    if (!resolvedPasswordHash) {
      return res.status(400).json({ success: false, error: 'Password is required for this role.' });
    }

    if (_id) {
      const userId = parseInt(_id);
      const existing = await knex('login').where('id', userId).first();
      if (!existing) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      await knex('login').where('id', userId).update({ display_name: safeName, full_name: safeName, email: safeUsername, role: safeRole, phone: safePhone || null, password_hash: resolvedPasswordHash, address: address ? address.trim() : null, alternative_phone: alternativePhone ? alternativePhone.trim() : null, bio: bio ? bio.trim() : null, avatar: avatar || '👤', pan_no: panNo ? panNo.trim() : null, profile_photo: profilePhoto ? profilePhoto.trim() : null });
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
      const inserted = await knex('login').insert({ display_name: safeName, full_name: safeName, email: safeUsername, role: safeRole, phone: safePhone || null, password_hash: resolvedPasswordHash, address: address ? address.trim() : null, alternative_phone: alternativePhone ? alternativePhone.trim() : null, bio: bio ? bio.trim() : null, avatar: avatar || '👤', pan_no: panNo ? panNo.trim() : null, profile_photo: profilePhoto ? profilePhoto.trim() : null });
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

    if (chat) {
      const payload = {
        id: chat.id,
        customerId: String(chat.customerId),
        sender: chat.sender,
        message: chat.message,
        timestamp: chat.timestamp,
      };
      io.to(`chat_${chat.customerId}`).emit('receive_message', payload);
      io.to('admin').emit('receive_message', payload);
    }

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

// Ensure API routes always return JSON on unhandled errors (helps clients avoid HTML error pages)
app.use((err, req, res, next) => {
  try {
    console.error('Unhandled server error:', err && (err.stack || err.message || err));
  } catch (e) {
    console.error('Error while logging error', e);
  }
  if (req && req.originalUrl && String(req.originalUrl).startsWith('/api')) {
    return res.status(err && err.status ? err.status : 500).json({ success: false, error: err && (err.message || 'Internal server error') });
  }
  return next(err);
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

let isShuttingDown = false;
const shutdown = (signal) => {
  if (process.env.NODE_ENV === 'test' || isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal || 'shutdown'}; closing server...`);

  const forceExitTimer = setTimeout(() => process.exit(0), 5000);
  forceExitTimer.unref?.();

  try {
    if (httpServer.listening) {
      httpServer.close(() => {
        try {
          sqliteDb.close(() => process.exit(0));
        } catch {
          process.exit(0);
        }
      });
    } else {
      try {
        sqliteDb.close(() => process.exit(0));
      } catch {
        process.exit(0);
      }
    }
  } catch {
    process.exit(0);
  }
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Export app and server objects for tests and other tooling
// (Removed explicit ESM export to avoid runtime loader issues when started via dev watcher)
globalThis.__dhakal_server__ = { app, httpServer, io, knex };
