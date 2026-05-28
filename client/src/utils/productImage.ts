export function resolveProductImageUrl(rawValue: string | undefined | null): string {
  const raw = String(rawValue || '').trim();
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
        bucket = parts.shift() || bucket;
        objectName = parts.join('/');
      } else {
        objectName = parts[0] || raw;
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
