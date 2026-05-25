import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ADMIN_DB_FILE = join(__dirname, 'admin.sqlite');

const sqlite = sqlite3.verbose();
const adminDb = new sqlite.Database(ADMIN_DB_FILE);

function ensureTable() {
  return new Promise((resolve, reject) => {
    adminDb.run(
      `CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      (err) => (err ? reject(err) : resolve())
    );
  });
}

function insertAdmin(email, plainPassword) {
  return new Promise((resolve, reject) => {
    const hash = bcrypt.hashSync(plainPassword, 10);
    const now = new Date().toISOString();
    adminDb.run(
      'INSERT INTO admins (email, password, created_at) VALUES (?, ?, ?)',
      [email, hash, now],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, email, created_at: now });
      }
    );
  });
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

(async function main() {
  try {
    await ensureTable();
    const email = process.argv[2] || (await prompt('Admin email: '));
    const pass = process.argv[3] || (await prompt('Admin password: '));
    if (!email || !pass) {
      console.error('Email and password are required');
      process.exit(1);
    }
    const res = await insertAdmin(email.trim(), pass.trim());
    console.log('Admin created:', res);
    process.exit(0);
  } catch (e) {
    console.error('Failed to create admin:', e.message || e);
    process.exit(1);
  }
})();
