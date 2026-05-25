#!/usr/bin/env node
// Simple secret generator for POS_JWT_SECRET
const crypto = require('crypto');
const len = 48; // 48 bytes -> 96 hex chars
console.log(crypto.randomBytes(len).toString('hex'));
