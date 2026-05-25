import React, { useEffect, useState } from 'react';
import { Product } from './inventoryTypes';
import { inventoryService } from './inventoryService';
import ProductForm from './ProductForm';

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name'|'stock'|'minStock'|'price'>('name');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = async () => {
    const p = await inventoryService.listProducts();
    setProducts(p);
  };

  useEffect(() => { load(); }, []);

  const onCreate = () => { setEditing(null); setShowForm(true); };
  const onEdit = (p: Product) => { setEditing(p); setShowForm(true); };
  const onDelete = async (id: string) => { await inventoryService.deleteProduct(id); load(); };

  // derived lists for filtering, sorting and pagination
  const qLower = query.trim().toLowerCase();
  let filteredList = products.slice();
  if (qLower) filteredList = filteredList.filter(x => (x.name||'').toLowerCase().includes(qLower) || (x.id||'').toLowerCase().includes(qLower) || (x.sku||'').toLowerCase().includes(qLower));
  filteredList.sort((a,b) => {
    if (sortBy === 'name') return (a.name||'').localeCompare(b.name||'');
    if (sortBy === 'stock') return (Number(b.stock||0) - Number(a.stock||0));
    if (sortBy === 'minStock') return (Number(b.minStock||0) - Number(a.minStock||0));
    if (sortBy === 'price') return (Number(b.sellingPrice||0) - Number(a.sellingPrice||0));
    return 0;
  });
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  if (page > totalPages) setPage(totalPages);
  const start = (page - 1) * pageSize;
  const pageItems = filteredList.slice(start, start + pageSize);

  return (
    <div style={{ padding: 18 }} id="inventory-products">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2>Products</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="Search by name or id" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="pos-form-input" style={{ width: 220 }} />
          <select className="pos-form-input" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="name">Name</option>
            <option value="stock">Stock</option>
            <option value="minStock">Min Stock</option>
            <option value="price">Price</option>
          </select>
          <select className="pos-form-input" value={String(pageSize)} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
          <div>
            <button onClick={onCreate} className="pos-btn">New Product</button>
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
            <th style={{ padding: 8 }}>ID</th>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>SKU</th>
            <th style={{ padding: 8 }}>Price</th>
            <th style={{ padding: 8 }}>Stock</th>
            <th style={{ padding: 8 }}>Min Stock</th>
            <th style={{ padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map(p => (
            <tr key={p.id}>
              <td style={{ padding: 8 }}>{p.id}</td>
              <td style={{ padding: 8 }}>{p.name}</td>
              <td style={{ padding: 8 }}>{p.sku}</td>
              <td style={{ padding: 8 }}>रू {Number(p.sellingPrice||0).toLocaleString()}</td>
              <td style={{ padding: 8 }}>{p.stock || 0}</td>
              <td style={{ padding: 8 }}>{p.minStock || 0}</td>
              <td style={{ padding: 8 }}>
                <button className="pos-sec-btn" onClick={() => onEdit(p)}>Edit</button>
                <button className="pos-sec-btn" onClick={async () => {
                  const v = prompt('Set min stock for product ' + p.name, String(p.minStock || 0));
                  if (v === null) return;
                  const n = Number(v || 0);
                  // try server update, fall back to local inventory service
                  try {
                    const res = await fetch(`/api/products/${encodeURIComponent(p.id)}/minstock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minStock: n }) });
                    if (res.ok) {
                      await load();
                      return;
                    }
                  } catch (e) {}
                  await inventoryService.updateProduct(p.id, { minStock: n });
                  await load();
                }}>Set min</button>
                <button className="pos-danger-btn" onClick={() => onDelete(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr><td colSpan={7} style={{ padding: 12, textAlign: 'center', color: '#666' }}>No products yet</td></tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ color: '#666' }}>
          Page {page} — {Math.max(1, Math.ceil((products.filter(x => { const q=query.trim().toLowerCase(); if (!q) return true; return (x.name||'').toLowerCase().includes(q) || (x.id||'').toLowerCase().includes(q) || (x.sku||'').toLowerCase().includes(q); }).length)/pageSize))} 
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pos-sec-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}>Prev</button>
          <button className="pos-sec-btn" onClick={() => setPage(p => p+1)}>Next</button>
        </div>
      </div>

      {showForm && (
        <div style={{ marginTop: 12 }}>
          <ProductForm product={editing || undefined} onSaved={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />
        </div>
      )}
    </div>
  );
}
