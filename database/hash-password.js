#!/usr/bin/env node
/**
 * Generate a shared SHA-256 password hash for D1 login seed data.
 * Usage: node database/hash-password.js admin123
 *
 * All staff roles use the same password; role is stored separately.
 */
const crypto = require('crypto');

const SHARED_SALT = '3df395c155649e40ea9250313a15022e';

const password = process.argv[2] || 'admin123';
const role = process.argv[3] || 'shared';
const salt = SHARED_SALT;

const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
console.log(`password: ${password}`);
console.log(`role/salt key: ${role}`);
console.log(`shared salt: ${salt}`);
console.log(`hash: ${hash}`);
