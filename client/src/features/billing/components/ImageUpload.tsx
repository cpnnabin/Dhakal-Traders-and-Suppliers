import React, { useState, ChangeEvent } from 'react';
import './ImageUpload.css';

/**
 * Simple reusable image upload component.
 * - Shows a file input that accepts images.
 * - Displays a preview of the selected image.
 * - Calls `onUpload` with the selected File when the user clicks Upload.
 */
interface ImageUploadProps {
  /** Callback invoked with the selected image file, should return the uploaded image URL */
  onUpload: (file: File) => Promise<string>;
  /** Optional placeholder image URL */
  placeholder?: string;
}

export default function ImageUpload({ onUpload, placeholder }: ImageUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(placeholder ?? '');
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selected.type)) {
      setError('Only JPG, PNG, or WEBP images are allowed');
      return;
    }
    if (selected.size > 2 * 1024 * 1024) {
      setError('File size must be ≤ 2 MB');
      return;
    }
    setError('');
    setFile(selected);
    setPreview('');
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await onUpload(file);
      setPreview(url);
    } catch (e) {
      setError('Upload failed – please try again');
    } finally {
      // Clear selected file and reset the file input UI regardless of success/failure
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploading(false);
    }
  };

  return (
    <div className="image-upload">
      <input type="file" accept="image/*" onChange={handleChange} ref={fileInputRef} />
      {error && <div className="upload-error">{error}</div>}
      {preview && (
        <div className="preview-wrapper">
          <img src={preview} alt="preview" className="preview-img" />
          <button type="button" className="remove-btn" onClick={() => { setFile(null); setPreview(''); }}>✕ Remove</button>
        </div>
      )}
      {uploading && <div className="upload-progress">Uploading...</div>}
      <button type="button" className="upload-btn" disabled={!file} onClick={handleUpload}>Upload</button>
    </div>
  );
}
