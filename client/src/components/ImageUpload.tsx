import React, { useState, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import { resolveProductImageUrl } from '../utils/productImage';

type ImageUploadProps = {
  initialImageUrl?: string;
  onUploaded?: (imageUrl: string) => void;
  uploadUrl?: string;
  buttonLabel?: string;
  title?: string;
  onUploadingChange?: (isUploading: boolean, progress: number) => void;
};

type ImageUploadRef = {
  upload: () => Promise<string>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ImageUpload = forwardRef(function ImageUpload(props: ImageUploadProps, ref: any) {
  const {
    initialImageUrl = '',
    onUploaded,
    uploadUrl = '/api/upload',
    buttonLabel = 'Upload',
    title = 'QR Image',
    onUploadingChange,
  } = props;
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [attemptLabel, setAttemptLabel] = useState('');
  const isRetrying = busy && attemptLabel.includes('Attempt 2');

  const uploadImageOnce = async () => {
    if (!file) {
      setError('Please choose an image first.');
      return '';
    }

    const formData = new FormData();
    formData.append('image', file);

      const token = sessionStorage.getItem('dt_pos_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'multipart/form-data' };
      if (token) headers.Authorization = `Bearer ${token}`;

    const response = await axios.post(uploadUrl, formData, {
        headers,
      onUploadProgress: (ev: any) => {
        try {
          const pct = ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0;
          setProgress(pct);
          onUploadingChange?.(true, pct);
        } catch (e) {}
      },
    });

    const nextUrl = resolveProductImageUrl(response.data?.imageUrl || '');
    setImageUrl(nextUrl);
    setProgress(100);
    onUploaded?.(nextUrl);
    onUploadingChange?.(false, 100);
    return nextUrl;
  };

  const uploadImage = async () => {
    if (!file) {
      setError('Please choose an image first.');
      return '';
    }

    setBusy(true);
    setError('');
    onUploadingChange?.(true, 0);

    try {
      const attempts = 2;
      let lastError: any = null;

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          setAttemptLabel(`Attempt ${attempt} of ${attempts}`);
          if (attempt > 1) {
            setError(`Retrying upload (attempt ${attempt} of ${attempts})...`);
            setProgress(0);
            onUploadingChange?.(true, 0);
            await sleep(500);
          }

          return await uploadImageOnce();
        } catch (err: any) {
          lastError = err;
        }
      }

      const message = lastError?.response?.data?.message || lastError?.message || 'Upload failed.';
      setError(message);
      onUploadingChange?.(false, 0);
      return '';
    } finally {
      setBusy(false);
      setAttemptLabel('');
    }
  };

  // Auto-upload as soon as a file is selected to ensure product save includes image
  const handleFileChange = (f: File | null) => {
    setFile(f);
    setError('');
    setProgress(0);
    if (f) {
      setBusy(true);
      onUploadingChange?.(true, 0);
      // fire-and-forget upload; ImageUpload.upload() still returns the uploaded URL if parent calls it
      uploadImage().catch(() => {});
    }
  };

  useImperativeHandle(ref, () => ({
    async upload() {
      if (!file) return '';
      return await uploadImage();
    }
  } as ImageUploadRef));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 12 }}>{title}</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
      />
      <button type="button" onClick={uploadImage} disabled={busy} className="pos-sec-btn">
        {busy ? `Uploading... ${progress}%` : buttonLabel}
      </button>
      {busy && attemptLabel && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 12,
            color: isRetrying ? '#8a4b00' : '#355070',
            background: isRetrying ? '#fff4e5' : '#eef6ff',
            border: `1px solid ${isRetrying ? '#ffd08a' : '#cfe2ff'}`,
          }}
        >
          <span style={{ fontSize: 14 }}>{isRetrying ? '↻' : '⏳'}</span>
          <span>{attemptLabel}</span>
        </div>
      )}
      {error && <div style={{ color: '#b00020', fontSize: 12 }}>{error}</div>}
      {busy && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 140, height: 8, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#4caf50', transition: 'width .2s' }} />
          </div>
          <div style={{ minWidth: 36, fontSize: 12 }}>{progress}%</div>
          <div style={{ fontSize: 14 }}>⏳</div>
        </div>
      )}
      {imageUrl && !busy && (
        <img
          src={imageUrl}
          width={300}
          alt="uploaded"
          style={{ maxWidth: '100%', objectFit: 'contain', border: '1px solid #eee', padding: 4 }}
        />
      )}
    </div>
  );
});

export default ImageUpload;