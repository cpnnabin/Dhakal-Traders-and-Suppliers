import express from 'express';
import minioClient from './utils/minioClient.js';

const router = express.Router();

// POST /reprocess
// body: { imageUrl: string }
router.post('/reprocess', async (req, res) => {
  try {
    const { imageUrl } = req.body || {};
    if (!imageUrl) return res.status(400).json({ success: false, message: 'imageUrl required' });

    const base = String(process.env.MINIO_PUBLIC_BASE_URL || `http://${process.env.MINIO_ENDPOINT || '127.0.0.1'}:${process.env.MINIO_PORT || 9000}`);
    let path = imageUrl;
    if (path.startsWith(base)) path = path.slice(base.length);
    // strip leading slash
    if (path.startsWith('/')) path = path.slice(1);
    // path should be bucket/object
    const parts = path.split('/');
    if (parts.length < 2) return res.status(400).json({ success: false, message: 'Invalid imageUrl format' });
    const bucket = parts.shift();
    const objectName = parts.join('/');

    // download object into buffer
    const buffer = await new Promise((resolve, reject) => {
      minioClient.getObject(bucket, objectName, (err, stream) => {
        if (err) return reject(err);
        const chunks = [];
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', (e) => reject(e));
      });
    });

    // process with sharp if available
    let processed = buffer;
    try {
      const sharpMod = await import('sharp').catch(() => null);
      if (sharpMod && sharpMod.default) {
        const sharp = sharpMod.default;
        // upscale gently and sharpen
        processed = await sharp(buffer).rotate().resize({ width: 2000, withoutEnlargement: false }).sharpen().jpeg({ quality: 92 }).toBuffer();
      }
    } catch (e) {
      console.warn('Reprocess: sharp failed', e?.message || e);
    }

    const ext = '.jpg';
    const newName = `${Date.now()}-enhanced${ext}`;
    await minioClient.putObject(bucket, newName, processed, processed.length, { 'Content-Type': 'image/jpeg' });

    const baseUrl = String(process.env.MINIO_PUBLIC_BASE_URL || `http://${process.env.MINIO_ENDPOINT || '127.0.0.1'}:${process.env.MINIO_PORT || 9000}`);
    const newUrl = `${baseUrl}/${bucket}/${newName}`;
    return res.json({ success: true, imageUrl: newUrl });
  } catch (error) {
    console.error('reprocess error', error);
    return res.status(500).json({ success: false, message: error?.message || 'reprocess failed' });
  }
});

export default router;
