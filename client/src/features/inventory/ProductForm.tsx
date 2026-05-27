import React, { useState } from 'react';
import { Product } from './inventoryTypes';
import { inventoryService } from './inventoryService';
import ImageUpload from '../../components/ImageUpload';

export default function ProductForm({ product, onSaved, onCancel }:
  { product?: Product; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<Product>(product ? { ...product } : { id: `P-${Date.now().toString().slice(-6)}`, name: '', sku: '', category: '', brand: '', unit: 'pcs', costPrice: 0, sellingPrice: 0, stock: 0, minStock: 0, createdAt: new Date().toISOString().split('T')[0], imageUrl: '' });

  const save = async () => {
    if (!form.name.trim()) return alert('Provide name');
    if (product) {
      await inventoryService.updateProduct(product.id, form);
    } else {
      await inventoryService.createProduct(form);
    }
    onSaved();
  };

  return (
    <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label>ID</label>
          <input className="pos-form-input" value={form.id} readOnly />
        </div>
        <div>
          <label>SKU</label>
          <input className="pos-form-input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label>Name</label>
          <input className="pos-form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label>Unit</label>
          <input className="pos-form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
        </div>
        <div>
          <label>Stock</label>
          <input type="number" className="pos-form-input" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value || 0) })} />
        </div>
        <div>
          <label>Min Stock</label>
          <input type="number" className="pos-form-input" value={form.minStock} onChange={e => setForm({ ...form, minStock: Number(e.target.value || 0) })} />
        </div>
        <div>
          <label>Price</label>
          <input type="number" className="pos-form-input" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: Number(e.target.value || 0) })} />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <ImageUpload
            title="Product Image"
            initialImageUrl={form.imageUrl || ''}
            buttonLabel="Upload Product Image"
            onUploaded={(imageUrl) => setForm({ ...form, imageUrl })}
          />
        </div>

        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="pos-sec-btn" onClick={onCancel}>Cancel</button>
          <button className="pos-btn" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
