import React, { useEffect, useState } from 'react';
import { Product } from './inventoryTypes';
import { inventoryService } from './inventoryService';

export default function LowStock() {
  const [products, setProducts] = useState<Product[]>([]);

  const load = async () => {
    const p = await inventoryService.listProducts();
    setProducts(p || []);
  };

  useEffect(() => { load(); }, []);

  const setMin = async (id: string) => {
    const v = prompt('Set min stock for product ' + id, '0');
    if (v === null) return;
    const n = Number(v || 0);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}/minstock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minStock: n }) });
      if (res.ok) { await load(); return; }
    } catch (e) {}
    await inventoryService.updateProduct(id, { minStock: n });
    await load();
  };

  const low = products.filter(p => (Number(p.minStock || 0) > 0) && Number(p.stock || 0) < Number(p.minStock || 0));

  return (
    <div style={{ padding: 18 }} id="inventory-low">
      <h2>Low Stock</h2>
      <div style={{ marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: 8 }}>ID</th>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Stock</th>
              <th style={{ padding: 8 }}>Min Stock</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {low.map(p => (
              <tr key={p.id}>
                <td style={{ padding: 8 }}>{p.id}</td>
                <td style={{ padding: 8 }}>{p.name}</td>
                <td style={{ padding: 8 }}>{p.stock || 0}</td>
                <td style={{ padding: 8 }}>{p.minStock || 0}</td>
                <td style={{ padding: 8 }}>
                  <button className="pos-sec-btn" onClick={() => setMin(p.id)}>Set min</button>
                  <button className="pos-sec-btn" onClick={async () => {
                    // quick reorder: open prompt to create stock IN entry
                    const q = prompt('Qty to add for ' + p.name, '1');
                    if (q === null) return;
                    const qty = Number(q || 0);
                    if (!qty) return alert('Invalid qty');
                    const id = `SE-${Date.now()}`;
                    await inventoryService.createStock({ id, productId: p.id, qty, type: 'in', date: new Date().toISOString(), note: 'Reorder from LowStock' });
                    await load();
                  }}>Reorder</button>
                </td>
              </tr>
            ))}
            {low.length === 0 && <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: '#666' }}>No low stock items</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
