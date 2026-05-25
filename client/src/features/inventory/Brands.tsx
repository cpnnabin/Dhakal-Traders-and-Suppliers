import React, { useEffect, useState } from 'react';
import { inventoryService } from './inventoryService';

export default function Brands() {
  const [items, setItems] = useState<any[]>([]);
  const [id, setId] = useState('');
  const [name, setName] = useState('');

  useEffect(() => { let mounted = true; (async () => { const list = await inventoryService.listBrands(); if (!mounted) return; setItems(list || []); })(); return () => { mounted = false; }; }, []);

  const add = async () => {
    if (!id.trim() || !name.trim()) return;
    const b = await inventoryService.createBrand({ id: id.trim(), name: name.trim() });
    setItems((s) => [b, ...s]); setId(''); setName('');
  };

  return (
    <div style={{ padding: 18 }}>
      <h3>Brands</h3>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input placeholder="id (e.g. brand-dhaka)" value={id} onChange={e => setId(e.target.value)} />
        <input placeholder="name" value={name} onChange={e => setName(e.target.value)} />
        <button onClick={add}>Add</button>
      </div>
      <ul style={{ marginTop: 12 }}>
        {items.map((c:any) => (
          <li key={c.id}>{c.name} <small style={{ color:'#666' }}>({c.id})</small></li>
        ))}
      </ul>
    </div>
  );
}
