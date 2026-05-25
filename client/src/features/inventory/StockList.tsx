import React, { useEffect, useState } from 'react';
import { StockEntry, Product } from './inventoryTypes';
import { inventoryService } from './inventoryService';

export default function StockList() {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Partial<StockEntry>>({ type: 'in', qty: 1, date: new Date().toISOString().slice(0,10) });
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseLevels, setWarehouseLevels] = useState<any[]>([]);

  const load = async () => {
    const e = await inventoryService.listStock();
    setEntries(e || []);
    const p = await inventoryService.listProducts();
    setProducts(p || []);
    const w = await inventoryService.listWarehouses();
    setWarehouses(w || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.productId) return alert('Select product');
    if (!form.qty || Number(form.qty) <= 0) return alert('Provide qty');
    const id = `SE-${Date.now()}`;
    const entry: StockEntry = { id, productId: String(form.productId), qty: Number(form.qty), type: (form.type as 'in'|'out') || 'in', date: form.date || new Date().toISOString(), warehouseId: form.warehouseId, note: form.note };
    await inventoryService.createStock(entry);
    setForm({ type: 'in', qty: 1, date: new Date().toISOString().slice(0,10) });
    await load();
  };

  return (
    <div style={{ padding: 18 }} id="inventory-stock">
      <h2>Stock IN / OUT</h2>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label>Product</label>
                <select className="pos-form-input" value={form.productId || ''} onChange={e => setForm({ ...form, productId: e.target.value })}>
                  <option value="">-- select --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                </select>
              </div>
              <div>
                <label>Type</label>
                <select className="pos-form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                  <option value="in">IN</option>
                  <option value="out">OUT</option>
                </select>
              </div>
              <div>
                <label>Warehouse</label>
                <select className="pos-form-input" value={form.warehouseId || ''} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
                  <option value="">-- (none) --</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label>Qty</label>
                <input type="number" className="pos-form-input" value={form.qty || 0} onChange={e => setForm({ ...form, qty: Number(e.target.value || 0) })} />
              </div>
              <div>
                <label>Date</label>
                <input type="date" className="pos-form-input" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label>Note</label>
                <input className="pos-form-input" value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <button className="pos-sec-btn" onClick={async () => {
                  if (!form.productId) return alert('Select product');
                  const rows = await inventoryService.listWarehouseStock(String(form.productId));
                  setWarehouseLevels(rows || []);
                }}>Show warehouse levels for selected product</button>
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="pos-sec-btn" onClick={() => setForm({ type: 'in', qty: 1, date: new Date().toISOString().slice(0,10) })}>Reset</button>
                <button className="pos-btn" onClick={save}>Save</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Recent Stock Entries</div>
            {warehouseLevels.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <strong>Per-warehouse levels:</strong>
                <ul>
                  {warehouseLevels.map((r:any) => <li key={r.id}>{r.warehouseId}: {r.qty}</li>)}
                </ul>
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: 8 }}>Date</th>
                  <th style={{ padding: 8 }}>Product</th>
                  <th style={{ padding: 8 }}>Type</th>
                  <th style={{ padding: 8 }}>Qty</th>
                  <th style={{ padding: 8 }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const prod = products.find(p => p.id === e.productId);
                  return (
                    <tr key={e.id}>
                      <td style={{ padding: 8 }}>{(e.date || '').slice(0,10)}</td>
                      <td style={{ padding: 8 }}>{prod ? prod.name : e.productId}</td>
                      <td style={{ padding: 8 }}>{e.type}</td>
                      <td style={{ padding: 8 }}>{e.qty}</td>
                      <td style={{ padding: 8 }}>{e.note || ''}</td>
                    </tr>
                  );
                })}
                {entries.length === 0 && <tr><td colSpan={5} style={{ padding: 12, color: '#666', textAlign: 'center' }}>No stock entries</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
