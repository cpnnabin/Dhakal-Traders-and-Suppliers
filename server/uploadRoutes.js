import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import path from 'path';

import minioClient from './utils/minioClient.js';
import { buildMinioProxyImageUrl } from './utils/minioStorage.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (String(header).startsWith('Bearer ')) return String(header).slice(7).trim();
  const legacy = req.headers['x-pos-token'];
  return legacy ? String(legacy).trim() : '';
}

function requirePosAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Missing auth token' });
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    // Ensure the uploads directory exists.
    const fs = require('fs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const payload = jwt.verify(token, secret);
    req.pos = payload;
    const role = String(payload?.role || '').toLowerCase();
    if (!['owner', 'admin', 'cashier'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// Server-side upload validation / optional resize
const MAX_FILE_SIZE = Number(process.env.MAX_UPLOAD_SIZE_BYTES || 5 * 1024 * 1024); // 5MB default
const ALLOWED_MIMES = (process.env.ALLOWED_IMAGE_MIMES || 'image/jpeg,image/png,image/webp,image/gif,image/avif').split(',').map((m) => m.trim()).filter(Boolean);

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided' });

    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, message: `File too large (max ${MAX_FILE_SIZE} bytes)` });
    }

    if (!ALLOWED_MIMES.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: `Invalid file type: ${req.file.mimetype}` });
    }

    const bucketName = String(process.env.MINIO_IMAGE_BUCKET || 'images');
    const safeOriginalName = path.basename(String(req.file.originalname || 'image')).replace(/\s+/g, '-');
    let fileName = `${Date.now()}-${safeOriginalName}`;
    let uploadBuffer = req.file.buffer;
    let contentType = req.file.mimetype;

    // Optional image resizing using sharp if available. Controlled by env MINIO_DISABLE_RESIZE=1 to skip.
    if (process.env.MINIO_DISABLE_RESIZE !== '1') {
      try {
        const sharpMod = await import('sharp').catch(() => null);
        if (sharpMod && sharpMod.default) {
          const sharp = sharpMod.default;
          // Resize to a reasonable max width to save storage and bandwidth (no enlargement)
          const resized = await sharp(req.file.buffer).rotate().resize({ width: 1200, withoutEnlargement: true }).toBuffer();
          if (resized && resized.length > 0 && resized.length <= MAX_FILE_SIZE) {
            uploadBuffer = resized;
            // If original was svg, set jpeg/png as result type; infer mime from original or default to jpeg
            const metadata = await sharp(uploadBuffer).metadata().catch(() => ({}));
            if (metadata && metadata.format) {
              contentType = `image/${metadata.format}`;
            }
            // update filename to indicate resizing
            const ext = (contentType === 'image/png' ? '.png' : contentType === 'image/webp' ? '.webp' : contentType === 'image/avif' ? '.avif' : contentType === 'image/gif' ? '.gif' : '.jpg');
            fileName = `${Date.now()}-resized${ext}`;
          }
        }
      } catch (e) {
        console.warn('Image resize skipped (sharp not available or failed):', e?.message || e);
      }
    }

    try {
      const exists = await minioClient.bucketExists(bucketName);
      if (!exists) await minioClient.makeBucket(bucketName, process.env.MINIO_REGION || 'us-east-1');
    } catch (bucketErr) {
      console.warn('MinIO bucket check/create warning:', bucketErr?.message || bucketErr);
    }

    await minioClient.putObject(
      bucketName,
      fileName,
      uploadBuffer,
      uploadBuffer.length,
      { 'Content-Type': contentType }
    );

    const imageUrl = buildMinioProxyImageUrl({ bucket: bucketName, name: fileName });
    return res.json({ success: true, imageUrl });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;