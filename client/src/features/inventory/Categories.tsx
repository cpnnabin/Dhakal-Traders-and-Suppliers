import React, { useEffect, useState } from 'react';
import { inventoryService } from './inventoryService';

export default function Categories() {
  const [items, setItems] = useState<any[]>([]);
  const [id, setId] = useState('');
  const [name, setName] = useState('');

  useEffect(() => { let mounted = true; (async () => { const list = await inventoryService.listCategories(); if (!mounted) return; setItems(list || []); })(); return () => { mounted = false; }; }, []);

  const add = async () => {
    if (!id.trim() || !name.trim()) return;
    try {
      const cat = await inventoryService.createCategory({ id: id.trim(), name: name.trim() });
      setItems((s) => [cat, ...s]); setId(''); setName('');
    } catch (err: any) {
      alert(err?.message || 'Unable to add category');
    }
  };

  return (
    <div style={{ padding: 18 }}>
      <h3>Categories</h3>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input placeholder="id (e.g. cat-herbs)" value={id} onChange={e => setId(e.target.value)} />
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
