import minioClient from './minioClient.js';

export function parseMinioObjectRef(value) {
  if (value && typeof value === 'object') {
    const bucket = String(value.bucket || 'images').trim();
    const objectName = String(value.name || value.objectName || value.path || '').trim();
    if (!objectName) return null;
    return { bucket: bucket || 'images', objectName };
  }

  const raw = String(value || '').trim();
  if (!raw || /^data:image\//i.test(raw)) return null;

  let bucket = 'images';
  let objectName = raw;

  if (/^\/api\/product-image\b/i.test(raw)) {
    try {
      const parsed = new URL(raw, 'http://localhost');
      bucket = parsed.searchParams.get('bucket') || bucket;
      objectName = parsed.searchParams.get('name') || parsed.searchParams.get('path') || '';
    } catch {
      return null;
    }
  } else if (/^https?:\/\//i.test(raw) || /^\/\//.test(raw)) {
    try {
      const url = new URL(raw.startsWith('//') ? `http:${raw}` : raw);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        bucket = parts.shift() || bucket;
        objectName = parts.join('/');
      } else {
        objectName = parts[0] || '';
      }
    } catch {
      objectName = '';
    }
  } else {
    objectName = raw.replace(/^\/+/, '').replace(/^images\//i, '');
  }

  if (!objectName) return null;
  return { bucket, objectName };
}

export function buildMinioProxyImageUrl(value) {
  const ref = parseMinioObjectRef(value);
  if (!ref) return '';
  return `/api/product-image?bucket=${encodeURIComponent(ref.bucket)}&name=${encodeURIComponent(ref.objectName)}`;
}

export async function deleteMinioObjectIfExists(value) {
  const ref = parseMinioObjectRef(value);
  if (!ref) return false;

  try {
    await minioClient.removeObject(ref.bucket, ref.objectName);
    return true;
  } catch (err) {
    const code = String(err?.code || err?.name || '').toLowerCase();
    if (code.includes('notfound') || code.includes('no such key') || code.includes('not found')) {
      return false;
    }
    console.warn('MinIO delete warning:', err?.message || err);
    return false;
  }
}