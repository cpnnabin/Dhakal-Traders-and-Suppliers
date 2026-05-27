import React, { useState } from 'react';
import axios from 'axios';

type ImageUploadProps = {
  initialImageUrl?: string;
  onUploaded?: (imageUrl: string) => void;
  uploadUrl?: string;
  buttonLabel?: string;
  title?: string;
};

export default function ImageUpload({
  initialImageUrl = '',
  onUploaded,
  uploadUrl = '/api/upload',
  buttonLabel = 'Upload',
  title = 'QR Image',
}: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const uploadImage = async () => {
    if (!file) {
      setError('Please choose an image first.');
      return;
    }

    try {
      setBusy(true);
      setError('');

      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const nextUrl = response.data?.imageUrl || '';
      setImageUrl(nextUrl);
      onUploaded?.(nextUrl);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 12 }}>{title}</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button type="button" onClick={uploadImage} disabled={busy} className="pos-sec-btn">
        {busy ? 'Uploading...' : buttonLabel}
      </button>
      {error && <div style={{ color: '#b00020', fontSize: 12 }}>{error}</div>}
      {imageUrl && (
        <img
          src={imageUrl}
          width={300}
          alt="uploaded"
          style={{ maxWidth: '100%', objectFit: 'contain', border: '1px solid #eee', padding: 4 }}
        />
      )}
    </div>
  );
}