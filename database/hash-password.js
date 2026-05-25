#!/usr/bin/env node
/**
 * Generate SHA-256 password hashes for D1 login seed data.
 * Usage: node database/hash-password.js admin123 admin
 */
const crypto = require('crypto');

const SALTS = {
  admin: '3df395c155649e40ea9250313a15022e',
  owner: 'fe877f79864df8449cf1d1ca7536b47a',
  cashier: 'aab0c9a2357f59aaa2ae79fd1d081729',
};

const password = process.argv[2] || 'admin123';
const role = process.argv[3] || 'admin';
const salt = SALTS[role] || password;

const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
console.log(`password: ${password}`);
console.log(`role/salt key: ${role}`);
console.log(`hash: ${hash}`);
