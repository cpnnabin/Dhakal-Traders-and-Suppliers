#!/usr/bin/env node
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ADMIN_DB_FILE = join(__dirname, '..', 'admin.sqlite');

const db = sqlite3.verbose();
const sqliteDb = new db.Database(ADMIN_DB_FILE);

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function getAllCustomersWithEmail() {
  return new Promise((resolve, reject) => {
    sqliteDb.all('SELECT id, name, email FROM customers WHERE email IS NOT NULL AND email != ""', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function buildHtml(name) {
  return `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px">
      <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border-radius:6px">
        <h2 style="color:#333;">Hello ${name || 'Customer'},</h2>
        <p style="font-size:15px; color:#555;">We have an important update from Dhakal Traders. Check our latest offers and visit the shop for new arrivals.</p>
        <p style="font-size:14px; color:#333;">Thank you for being with us.</p>
        <hr style="border:none; border-top:1px solid #eee" />
        <p style="font-size:12px; color:#aaa; text-align:center">© ${new Date().getFullYear()} Dhakal Traders</p>
      </div>
    </div>
  `;
}

async function main() {
  const dryRun = !(process.argv.includes('--send') && (process.env.MAIL_CONFIRM === 'true' || process.env.MAIL_CONFIRM === '1'));

  console.log('Mail script started. Dry run:', dryRun);

  const customers = await getAllCustomersWithEmail();
  console.log(`Found ${customers.length} customers with email addresses.`);

  if (customers.length === 0) {
    process.exit(0);
  }

  for (const c of customers) {
    const to = c.email;
    const name = c.name || '';
    const subject = 'Update from Dhakal Traders';
    const html = buildHtml(name);

    console.log(`Preparing to send to ${to} (${name})`);

    if (dryRun) {
      console.log('[DRY RUN] Skipping send to', to);
      continue;
    }

    try {
      await transporter.sendMail({
        from: `Dhakal Traders <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });
      console.log('Sent to', to);
    } catch (err) {
      console.error('Failed to send to', to, err.message || err);
    }
  }

  console.log('Mail script finished.');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
