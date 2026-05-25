import React, { useEffect, useState } from 'react';

export default function ExpiryAlerts() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterUnread, setFilterUnread] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/notifications?limit=500');
      const j = await r.json();
      let items = (j.notifications || []).filter((n:any)=>n.type === 'expiry');
      if (filterUnread) items = items.filter((x:any) => Number(x.read || 0) === 0);
      setNotes(items);
    } catch (e) { setNotes([]); }
    setLoading(false);
  };

  useEffect(()=>{ load(); }, [filterUnread]);

  const clearAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    load();
  };

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    load();
  };

  return (
    <div style={{ padding: 18 }}>
      <h3>Expiry Alerts</h3>
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={load} disabled={loading}>Refresh</button>
        <button onClick={clearAll} style={{ marginLeft: 8 }}>Mark all read</button>
        <label style={{ marginLeft: 12 }}><input type="checkbox" checked={filterUnread} onChange={e => setFilterUnread(e.target.checked)} /> Show unread only</label>
      </div>
      <ul style={{ marginTop: 12 }}>
        {notes.map((n:any)=>(
          <li key={n.id} style={{ marginBottom: 8, padding: 8, border: '1px solid #eee', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{n.title}</strong>
                <div style={{ color: '#444' }}>{n.body}</div>
                <div style={{ color: '#666', fontSize: 12 }}>{n.created_at}</div>
                {n.data && typeof n.data === 'object' && (
                  <pre style={{ marginTop: 6, background: '#fafafa', padding: 8, borderRadius: 4, fontSize: 12 }}>{JSON.stringify(n.data, null, 2)}</pre>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => markRead(n.id)}>Mark read</button>
              </div>
            </div>
          </li>
        ))}
        {notes.length === 0 && <li style={{ color: '#666' }}>No expiry alerts</li>}
      </ul>
    </div>
  );
}
