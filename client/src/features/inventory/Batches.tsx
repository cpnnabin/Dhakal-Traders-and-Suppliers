import React, { useEffect, useState } from 'react';
import { inventoryService } from './inventoryService';

export default function Batches() {
  const [batches, setBatches] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [id, setId] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [qty, setQty] = useState(0);
  const [expiry, setExpiry] = useState('');

  useEffect(() => { let m=true; (async ()=>{ const list = await inventoryService.listBatches(); if(!m) return; setBatches(list||[]); })(); return ()=>{m=false}; }, []);

  const add = async () => {
    if (!id.trim() || !productId.trim()) return;
    try {
      const b = await inventoryService.createBatch({ id: id.trim(), productId: productId.trim(), batch_no: batchNo.trim(), qty: Number(qty), expiry_date: expiry || null });
      setBatches((s)=>[b,...s]); setId(''); setBatchNo(''); setQty(0); setExpiry('');
    } catch (err: any) {
      window.alert(err?.message || 'Unable to add batch');
    }
  };

  const runCheck = async () => {
    try {
      const rows = await inventoryService.checkExpiry(30);
      if (rows && rows.length) {
        window.alert(`Found ${rows.length} expiring batches`);
      } else {
        window.alert('No expiring batches found');
      }
    } catch (err: any) {
      window.alert(err?.message || 'Unable to check expiry');
    }
  };

  return (
    <div style={{ padding: 18 }}>
      <h3>Batch Tracking</h3>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input placeholder="id (batch-id)" value={id} onChange={e=>setId(e.target.value)} />
        <input placeholder="product id" value={productId} onChange={e=>setProductId(e.target.value)} />
        <input placeholder="batch no" value={batchNo} onChange={e=>setBatchNo(e.target.value)} />
        <input placeholder="qty" type="number" value={qty} onChange={e=>setQty(Number(e.target.value))} />
        <input placeholder="expiry (YYYY-MM-DD)" value={expiry} onChange={e=>setExpiry(e.target.value)} />
        <button onClick={add}>Add Batch</button>
        <button onClick={runCheck}>Check Expiry (30d)</button>
      </div>

      <ul style={{ marginTop: 12 }}>
        {batches.map((b:any)=> (
          <li key={b.id}>{b.batch_no || b.id} — {b.productId} — qty: {b.qty} — exp: {b.expiry_date || '—'}</li>
        ))}
      </ul>
    </div>
  );
}
