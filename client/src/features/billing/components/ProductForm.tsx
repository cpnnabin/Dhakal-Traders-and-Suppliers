import React, { useState } from 'react';
import { authFetch } from '../../../utils/auth';
import ImageUpload from './ImageUpload';
import './ProductForm.css';

/**
 * Simple product form used in the billing section.
 * Allows entering name, price, quantity and uploading an image.
 */
interface ProductFormProps {
  /**
   * Called with the new product data when the form is submitted.
   * The `imageUrl` will be the URL returned by the upload handler.
   */
  onSubmit: (data: {
    name: string;
    price: number;
    qty: number;
    imageUrl: string;
  }) => void;
}

export default function ProductForm({ onSubmit }: ProductFormProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Hook up the ImageUpload component to store the uploaded URL
  const handleUpload = async (file: File) => {
    // Real upload to backend endpoint
    const form = new FormData();
    form.append('image', file);
    try {
      const response = await authFetch('/api/upload', {
          method: 'POST',
          body: form,
          // Do NOT set Content-Type; browser will set multipart boundary
        });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.message || 'Upload failed';
        setError(msg);
        throw new Error(msg);
      }
      const data = await response.json();
      const url = data.imageUrl || '';
      setImageUrl(url);
      return url; // Return the URL so ImageUpload can set preview
    } catch (e) {
      console.error('Upload error:', e);
      setError('Upload failed – please try again');
      throw e;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !qty) return;
    onSubmit({
      name,
      price: parseFloat(price),
      qty: parseInt(qty, 10),
      imageUrl,
    });
    // reset fields
    setName('');
    setPrice('');
    setQty('');
    setImageUrl('');
  };

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <h3 className="form-title">Add New Product</h3>
      <label>
        Name
        <input type="text" value={name} onChange={e => setName(e.target.value)} required />
      </label>
      <label>
        Price (Rs.)
        <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
      </label>
      <label>
        Quantity
        <input type="number" value={qty} onChange={e => setQty(e.target.value)} required />
      </label>
      <label>
        Image
        <ImageUpload onUpload={handleUpload} placeholder={imageUrl} />
      </label>
      <button type="submit" className="submit-btn" disabled={!imageUrl}>
        Save Product
      </button>
    </form>
  );
}
