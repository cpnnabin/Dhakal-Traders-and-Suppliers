import React, { useEffect, useState } from 'react';
import socket from '../sockets/socket';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: any;
  time: string;
  read?: boolean;
}

export default function NotificationsCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = React.useState(0);

  useEffect(() => {
    const push = (n: Notification) => {
      setItems(s => [n, ...s].slice(0, 500));
      try { if (!n.read) setUnread(u => u + 1); } catch (e) {}
    };

    const handleOrder = (payload: any) => {
      push({ id: `order:${payload.id || Date.now()}`, type: 'order', title: 'New order', body: `Order ${payload.id} — ${payload.status || ''}`, data: payload, time: new Date().toISOString(), read: false });
    };
    const handleSale = (payload: any) => {
      push({ id: `sale:${payload.id || Date.now()}`, type: 'sale', title: 'New sale', body: `Sale ${payload.id} — ${payload.total || ''}`, data: payload, time: new Date().toISOString(), read: false });
    };
    const handleStockLow = (payload: any) => {
      push({ id: `stock:${payload.productId || Date.now()}`, type: 'stock', title: 'Low stock', body: `${payload.name || payload.productName || payload.productId} stock ${payload.stock} < ${payload.minStock}`, data: payload, time: new Date().toISOString(), read: false });
    };

    try {
      socket.on('order:new', handleOrder);
      socket.on('sale:new', handleSale);
      socket.on('stock:low', handleStockLow);
    } catch (e) {}

    return () => {
      try {
        socket.off('order:new', handleOrder);
        socket.off('sale:new', handleSale);
        socket.off('stock:low', handleStockLow);
      } catch (e) {}
    };
  }, []);

  // load persisted notifications for this role on mount
  useEffect(() => {
    (async () => {
      try {
        const sess = sessionStorage.getItem('dt_pos_role') || '';
        const role = sess || '';
        const q = role ? `?role=${encodeURIComponent(role)}&limit=20&offset=0` : '?limit=20&offset=0';
        const r = await fetch(`/api/notifications${q}`);
        const j = await r.json();
        if (j && j.success && Array.isArray(j.notifications)) {
          setItems(j.notifications.map((n: any) => ({ id: `db:${n.id}`, dbId: n.id, type: n.type, title: n.title, body: n.body, data: n.data, time: n.created_at, read: !!n.read })));
        }
      } catch (e) {}
    })();
  }, []);

  // unread count polling
  useEffect(() => {
    let mounted = true;
    const loadCount = async () => {
      try {
        const role = sessionStorage.getItem('dt_pos_role') || '';
        const q = role ? `?role=${encodeURIComponent(role)}` : '';
        const r = await fetch(`/api/notifications/unread-count${q}`);
        const j = await r.json();
        if (mounted && j && j.success) setItems(s => { /* keep items but we will show count via separate state below */ return s; });
        if (mounted && j && j.success) setUnread(j.count || 0);
      } catch (e) {}
    };
    loadCount();
    const iv = setInterval(loadCount, 15000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  // derived local unread is kept in state `unread` which is updated when items are added/marked

  const markRead = (id?: string) => {
    if (!id) {
      // mark all via API
      (async () => {
        try {
          const role = sessionStorage.getItem('dt_pos_role') || '';
          await fetch('/api/notifications/read-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
          setItems(s => s.map(i => ({ ...i, read: true })));
          setUnread(0);
        } catch (e) {}
      })();
      return;
    }
    (async () => {
      try {
        const dbId = (id && id.startsWith('db:')) ? Number(id.slice(3)) : null;
        if (dbId) await fetch(`/api/notifications/${dbId}/read`, { method: 'POST' });
        setItems(s => s.map(i => i.id === id ? { ...i, read: true } : i));
        setUnread(u => Math.max(0, u - 1));
      } catch (e) {}
    })();
  };

  return (
    <div className="notifications-root">
      <button type="button" className="pos-notif-bell" aria-label={`Notifications (${unread})`} onClick={() => setOpen(o => !o)}>
        <i className="ri-notification-line" />
        {unread > 0 && <span className="pos-notif-count">{unread}</span>}
      </button>

      {open && (
        <div className="pos-notif-panel">
          <div className="pos-notif-panel-header">
            <strong>Notifications</strong>
            <div>
              <button type="button" onClick={() => markRead()}>Mark all read</button>
              <button type="button" onClick={() => setItems([])}>Clear</button>
            </div>
          </div>
          <div className="pos-notif-list">
            {items.length === 0 && <div className="pos-notif-empty">No notifications</div>}
            {items.map(it => (
              <div key={it.id} className={`pos-notif-item${it.read ? ' read' : ''}`} onClick={() => markRead(it.id)}>
                <div className="pos-notif-item-title">{it.title}</div>
                <div className="pos-notif-item-body">{it.body}</div>
                <div className="pos-notif-item-time">{new Date(it.time).toLocaleString()}</div>
              </div>
            ))}
            <div style={{ padding: 8, textAlign: 'center' }}>
              <button type="button" onClick={async () => {
                try {
                  const role = sessionStorage.getItem('dt_pos_role') || '';
                  const offset = items.length || 0;
                  const q = role ? `?role=${encodeURIComponent(role)}&limit=20&offset=${offset}` : `?limit=20&offset=${offset}`;
                  const r = await fetch(`/api/notifications${q}`);
                  const j = await r.json();
                  if (j && j.success && Array.isArray(j.notifications)) {
                    setItems(s => [...s, ...j.notifications.map((n: any) => ({ id: `db:${n.id}`, dbId: n.id, type: n.type, title: n.title, body: n.body, data: n.data, time: n.created_at, read: !!n.read }))]);
                  }
                } catch (e) {}
              }}>Load more</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pos-notif-bell { position: relative; background: transparent; border: none; color: inherit; font-size: 18px; padding: 6px; }
        .pos-notif-count { position: absolute; top: -4px; right: -4px; background: #ef4444; color: #fff; border-radius: 999px; padding: 2px 6px; font-size: 11px; }
        .pos-notif-panel { position: absolute; right: 8px; top: 48px; width: 360px; max-height: 420px; overflow: auto; background: #fff; border: 1px solid #e6e6e6; box-shadow: 0 8px 24px rgba(16,24,40,0.08); border-radius: 8px; z-index: 1200; }
        .pos-notif-panel-header { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid #f3f4f6; }
        .pos-notif-list { padding: 8px; }
        .pos-notif-item { padding: 8px; border-radius:6px; cursor:pointer; border:1px solid transparent; }
        .pos-notif-item:not(.read):hover { background:#f8fafc; }
        .pos-notif-item.read { opacity:0.6; }
        .pos-notif-item + .pos-notif-item { margin-top:6px; }
        .pos-notif-item-title { font-weight:600; }
        .pos-notif-item-body { font-size:13px; color:#374151; }
        .pos-notif-item-time { font-size:11px; color:#9CA3AF; margin-top:6px; }
        .pos-notif-empty { padding: 16px; color: #6B7280; text-align:center; }
      `}</style>
    </div>
  );
}
