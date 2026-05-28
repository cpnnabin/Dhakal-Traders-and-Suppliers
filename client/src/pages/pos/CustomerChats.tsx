import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { getPOSSession } from '../POSLogin';
import { usePOS } from './POSContext';
import { loadLS, LS, Product } from './posTypes';

const API_URL = (() => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') {
      return 'http://localhost:5001';
    }
    return '';
  }
  return import.meta.env.VITE_API_URL || '';
})();

export default function CustomerChats() {
  const { cashier } = usePOS();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const products: Product[] = loadLS(LS.products, []);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Use the most stable identifier available so admin inboxes can match the thread
  const session = getPOSSession();
  const customerKeys = Array.from(new Set([
    cashier?.id,
    cashier?._id,
    cashier?.login_id,
    cashier?.username,
    session.username,
    session.cashier,
    cashier?.email,
    cashier?.phone,
  ].map((value) => String(value || '').trim()).filter(Boolean)));

  const customerId = customerKeys[0] || 'pos_customer';

  const formatTime = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  useEffect(() => {
    // Fetch history using all available customer aliases so older chats still appear
    const loadHistory = async () => {
      const merged: any[] = [];
      const seen = new Set<string>();

      for (const key of (customerKeys.length > 0 ? customerKeys : [customerId])) {
        try {
          const res = await fetch(`${API_URL}/api/chats/${encodeURIComponent(key)}`);
          if (!res.ok) continue;
          const data = await res.json();
          if (!data.success || !Array.isArray(data.chats)) continue;

          data.chats.forEach((msg: any) => {
            const uniq = `${msg.id || ''}|${msg.timestamp || ''}|${msg.sender || ''}|${msg.message || ''}`;
            if (!seen.has(uniq)) {
              seen.add(uniq);
              merged.push(msg);
            }
          });
        } catch {
          // ignore and try the next alias
        }
      }

      merged.sort((a, b) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime());
      setMessages(merged);
    };

    void loadHistory();

    // Initialize socket
    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_chat', customerId);
    });

    newSocket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [customerId]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !customerId) return;

    const payload = {
      customerId: customerId,
      sender: 'customer',
      message: input.trim()
    };

    const optimistic = { ...payload, timestamp: new Date().toISOString(), id: `tmp-${Date.now()}` };
    setMessages(prev => [...prev, optimistic]);
    setInput('');

    if (socket?.connected) {
      socket.emit('send_message', payload);
      return;
    }

    fetch(`${API_URL}/api/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessages(prev => prev.map(msg => msg.id === optimistic.id ? (data.chat || msg) : msg));
        }
      })
      .catch(() => {});
  };

  const sendProduct = (prod: Product) => {
    if (!customerId) return;
    const msg = `🛒 I'm interested in: *${prod.nameEn} / ${prod.nameNe}*\nPrice: रू ${prod.sellingPrice}/${prod.unit}\nAvailable: ${prod.stock} ${prod.unit}`;
    const payload: any = { customerId, sender: 'customer', message: msg };
    if (socket && socket.connected) {
      socket.emit('send_message', payload);
    }
    setShowProductPicker(false);
    setProductSearch('');
  };

  const filteredProductsForChat = products.filter(p => {
    const q = productSearch.toLowerCase();
    return p.stock > 0 && (!q || p.nameEn.toLowerCase().includes(q) || p.nameNe.includes(q));
  });

  return (
    <div className="customer-chat-container">
      <div className="customer-chat-header">
        <div className="customer-chat-title-text">Chat with Admin Support</div>
        <button
          type="button"
          onClick={() => { window.location.href = '/pos'; }}
          className="customer-chat-back-btn"
        >
          Billing (POS)
        </button>
      </div>
      
      <div className="customer-chat-messages">
        {messages.map((m, i) => {
          const isCustomer = m.sender === 'customer';
          return (
            <div key={i} className={`customer-chat-bubble-row ${isCustomer ? 'self' : 'other'}`}>
              <div className="customer-chat-bubble">
                <div className="customer-chat-bubble-meta">
                  <strong className="customer-chat-sender">{isCustomer ? 'You' : 'Admin'}:</strong>
                  <span className="customer-chat-time">{formatTime(m.timestamp || m.createdAt)}</span>
                </div>
                <div className="customer-chat-message-text">{m.message}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 0.75rem' }}>
        {showProductPicker && (
          <div className="chat-product-picker">
            <div className="cpp-header">
              <span>🛒 Browse Products</span>
              <button className="cpp-close" onClick={() => setShowProductPicker(false)}>✕</button>
            </div>
            <input className="cpp-search" placeholder="Search product..." value={productSearch} onChange={e => setProductSearch(e.target.value)} autoFocus />
            <div className="cpp-grid">
              {filteredProductsForChat.map(p => (
                <button key={p.id} className="cpp-product" onClick={() => sendProduct(p)}>
                  <span className="cpp-emoji">{p.emoji}</span>
                  <span className="cpp-name">{p.nameEn}</span>
                  <span className="cpp-price">रू {p.sellingPrice}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <form onSubmit={sendMessage} className="customer-chat-form">
        <button type="button" onClick={() => setShowProductPicker(v => !v)} style={{ padding: '0.6rem 0.8rem', background: showProductPicker ? '#0F172A' : '#F1F5F9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }} title="Browse products">
          🛒
        </button>
        <input 
          className="customer-chat-input"
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Type a message..." 
        />
        <button type="submit" className="customer-chat-send-btn">
          Send
        </button>
      </form>
    </div>
  );
}
