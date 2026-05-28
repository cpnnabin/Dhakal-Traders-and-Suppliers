import React, { useEffect, useState } from 'react';
import { inventoryService } from './inventoryService';

export default function Warehouses() {
  const [items, setItems] = useState<any[]>([]);
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [loc, setLoc] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [transfer, setTransfer] = useState<{ productId?: string; from?: string; to?: string; qty?: number; note?: string }>({});

  useEffect(() => { let mounted = true; (async () => { const list = await inventoryService.listWarehouses(); if (!mounted) return; setItems(list || []); })(); return () => { mounted = false; }; }, []);
  useEffect(() => { let mounted = true; (async () => { const p = await inventoryService.listProducts(); if (!mounted) return; setProducts(p || []); })(); return () => { mounted = false; }; }, []);

  const add = async () => {
    if (!id.trim() || !name.trim()) return;
    try {
      const w = await inventoryService.createWarehouse({ id: id.trim(), name: name.trim(), location: loc.trim() });
      setItems((s) => [w, ...s]); setId(''); setName(''); setLoc('');
    } catch (err: any) {
      alert(err?.message || 'Unable to add warehouse');
    }
  };

  return (
    <div style={{ padding: 18 }}>
      <h3>Warehouses</h3>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input placeholder="id (e.g. wh-main)" value={id} onChange={e => setId(e.target.value)} />
        <input placeholder="name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="location" value={loc} onChange={e => setLoc(e.target.value)} />
        <button onClick={add}>Add</button>
      </div>
      <ul style={{ marginTop: 12 }}>
        {items.map((c:any) => (
          <li key={c.id}>{c.name} <small style={{ color:'#666' }}>{c.location ? `(${c.location})` : `(${c.id})`}</small></li>
        ))}
      </ul>
      <div style={{ marginTop: 18 }}>
        <h4>Transfer between warehouses</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <div>
            <label>Product</label>
            <select value={transfer.productId || ''} onChange={e => setTransfer(t => ({ ...t, productId: e.target.value }))}>
              <option value="">-- select --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label>From</label>
            <select value={transfer.from || ''} onChange={e => setTransfer(t => ({ ...t, from: e.target.value }))}>
              <option value="">--</option>
              {items.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label>To</label>
            <select value={transfer.to || ''} onChange={e => setTransfer(t => ({ ...t, to: e.target.value }))}>
              <option value="">--</option>
              {items.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label>Qty</label>
            <input type="number" value={transfer.qty || ''} onChange={e => setTransfer(t => ({ ...t, qty: Number(e.target.value || 0) }))} />
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={async () => {
              if (!transfer.productId || !transfer.from || !transfer.to || !transfer.qty) return alert('Provide product/from/to/qty');
              try {
                await inventoryService.transfer(String(transfer.productId), String(transfer.from), String(transfer.to), Number(transfer.qty), transfer.note || '');
                alert('Transfer executed');
              } catch (err: any) {
                alert(err?.message || 'Unable to transfer stock');
              }
              setTransfer({});
            }}>Transfer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
