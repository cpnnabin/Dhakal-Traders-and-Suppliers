import * as Minio from 'minio';

const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

const requiredMinioVars = ['MINIO_ENDPOINT', 'MINIO_PORT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY'];
if (isProduction) {
  const missing = requiredMinioVars.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length > 0) {
    throw new Error(`Missing required MinIO environment variables in production: ${missing.join(', ')}`);
  }
}

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: String(process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || (!isProduction ? 'admin' : ''),
  secretKey: process.env.MINIO_SECRET_KEY || (!isProduction ? 'password123' : ''),
});

export default minioClient;