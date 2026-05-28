import React, { useMemo, useState, useEffect, useRef } from 'react';
import '../../styles/pos/pos-chats.css';
import { io, Socket } from 'socket.io-client';
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

function formatChatTime(timestamp?: string) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getLastMessage(chat: any) {
  return chat?.messages?.length ? chat.messages[chat.messages.length - 1] : null;
}

export default function AdminChats() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const products: Product[] = loadLS(LS.products, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mergedChats = useMemo(() => customers.map((customer) => {
    const existing = chats.find((chat) => String(chat.customerId) === String(customer._id));
    return existing || {
      customerId: customer._id,
      customerName: customer.name,
      messages: [],
      customerPhone: customer.phone,
      customerEmail: customer.email,
    };
  }), [customers, chats]);

  const visibleChats = useMemo(() => {
    const combined = [
    ...mergedChats,
    ...chats.filter((chat) => !customers.some((customer) => String(customer._id) === String(chat.customerId))),
  ];

    const normalizedSearch = search.trim().toLowerCase();
    const filtered = normalizedSearch
      ? combined.filter((chat) => {
          const lastMessage = getLastMessage(chat)?.message || '';
          return [chat.customerName, chat.customerPhone, chat.customerEmail, lastMessage]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch));
        })
      : combined;

    return [...filtered].sort((a, b) => {
      const aTime = getLastMessage(a)?.timestamp ? new Date(getLastMessage(a).timestamp).getTime() : 0;
      const bTime = getLastMessage(b)?.timestamp ? new Date(getLastMessage(b).timestamp).getTime() : 0;
      return bTime - aTime || String(a.customerName).localeCompare(String(b.customerName));
    });
  }, [chats, customers, mergedChats, search]);

  const selectedLastMessage = getLastMessage(selectedChat);

  useEffect(() => {
    // Fetch customers and chat history so every customer shows in the list
    Promise.all([
      fetch(`${API_URL}/api/customers`).then(res => res.json()).catch(() => ({ success: false })),
      fetch(`${API_URL}/api/pos/customers`).then(res => res.json()).catch(() => ({ success: false })),
      fetch(`${API_URL}/api/admin/chats`).then(res => res.json()),
    ]).then(([customersHosted, customersLocal, chatsData]) => {
      const customerList = customersHosted?.success ? (customersHosted.customers || []) : (customersLocal?.success ? (customersLocal.customers || []) : []);
      if (customerList.length > 0) {
        setCustomers(customerList);
      }
      if (chatsData.success) {
        setChats(chatsData.chats || []);
      }
    });

    // Initialize socket
    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_admin');
    });

    newSocket.on('receive_message', (msg) => {
      setChats(prev => {
        const existing = prev.find(c => c.customerId === msg.customerId);
        if (existing) {
          return prev.map(c => 
            c.customerId === msg.customerId 
            ? { ...c, messages: [...c.messages, msg] }
            : c
          );
        } else {
          // If new customer chat
          return [{ customerId: msg.customerId, customerName: 'Customer ' + msg.customerId, messages: [msg] }, ...prev];
        }
      });
      
      setSelectedChat((currentSelected: any) => {
        if (currentSelected && currentSelected.customerId === msg.customerId) {
          return { ...currentSelected, messages: [...currentSelected.messages, msg] };
        }
        return currentSelected;
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!selectedChat && visibleChats.length > 0) {
      setSelectedChat(visibleChats[0]);
    }
  }, [visibleChats, selectedChat]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !selectedChat) return;
    socket.emit('send_message', {
      customerId: selectedChat.customerId,
      sender: 'admin',
      message: input.trim()
    });
    setInput('');
  };

  const sendProduct = (prod: Product) => {
    if (!socket || !selectedChat) return;
    const msg = `🛍️ *${prod.nameEn} / ${prod.nameNe}*\nPrice: रू ${prod.sellingPrice}/${prod.unit}\nStock: ${prod.stock} ${prod.unit} available`;
    socket.emit('send_message', {
      customerId: selectedChat.customerId,
      sender: 'admin',
      message: msg
    });
    setShowProductPicker(false);
    setProductSearch('');
  };

  const filteredProductsForChat = products.filter(p => {
    const q = productSearch.toLowerCase();
    return !q || p.nameEn.toLowerCase().includes(q) || p.nameNe.includes(q);
  });

  return (
    <div className="admin-chats-container">
      {/* Sidebar: List of chats */}
      <aside className="admin-sidebar">
        <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>All Customers</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: 12, color: '#94A3B8' }}>{visibleChats.length} conversation{visibleChats.length === 1 ? '' : 's'}</p>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.65rem 0.8rem' }}>
            <i className="ri-search-line" style={{ color: '#94A3B8' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer..."
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
          {visibleChats.length === 0 ? (
            <div style={{ color: '#94A3B8', fontSize: 13, padding: '1rem' }}>No customers found.</div>
          ) : null}

          {visibleChats.map(chat => {
            const lastMessage = getLastMessage(chat);
            const lastTime = formatChatTime(lastMessage?.timestamp);
            const isActive = selectedChat?.customerId === chat.customerId;
            return (
          <button
            key={chat.customerId}
            type="button"
            onClick={() => setSelectedChat(chat)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.9rem 1rem',
              border: 'none',
              background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              borderRadius: 14,
              marginBottom: 8,
              transition: 'background 0.15s ease, transform 0.15s ease',
              boxShadow: isActive ? '0 8px 20px rgba(59, 130, 246, 0.12)' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.3, wordBreak: 'break-word' }}>{chat.customerName}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3, wordBreak: 'break-word' }}>
                  {chat.customerPhone || chat.customerEmail || `ID ${chat.customerId}`}
                </div>
              </div>
              {lastTime ? <span style={{ fontSize: 11, color: '#CBD5E1', whiteSpace: 'nowrap' }}>{lastTime}</span> : null}
            </div>
            <div style={{ fontSize: 12, color: '#CBD5E1', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lastMessage ? lastMessage.message : 'No messages yet'}
            </div>
          </button>
            );
          })}
        </div>
      </aside>

      {/* Main chat window */}
      <div className="admin-chat-main">
        {selectedChat ? (
          <>
            <div style={{ padding: '1rem 1.2rem', background: 'linear-gradient(90deg, #0F172A, #334155)', color: 'white', fontWeight: 700 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15 }}>Chat with {selectedChat.customerName}</span>
                <span style={{ fontSize: 12, opacity: 0.95, fontWeight: 500 }}>
                  {selectedLastMessage?.timestamp ? formatChatTime(selectedLastMessage.timestamp) : 'No message time yet'}
                </span>
              </div>
            </div>
            <div style={{ flex: 1, padding: '1rem 1.2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'linear-gradient(180deg, #ffffff, #F8FAFC)' }}>
              {selectedChat.messages.length === 0 ? (
                <div style={{ color: '#94A3B8', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', fontSize: 14 }}>
                  No messages yet. Say hello to start the conversation.
                </div>
              ) : (
                selectedChat.messages.map((m: any, i: number) => (
                  <div key={i} style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.sender === 'admin' ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    marginLeft: m.sender === 'admin' ? 'auto' : 0,
                  }}>
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: m.sender === 'admin' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      backgroundColor: m.sender === 'admin' ? '#DCFCE7' : '#F8FAFC',
                      border: m.sender !== 'admin' ? '1px solid #E2E8F0' : '1px solid rgba(34,197,94,0.12)',
                      color: '#0F172A',
                      boxShadow: '0 4px 10px rgba(15,23,42,0.05)',
                      wordBreak: 'break-word'
                    }}>
                      {m.message}
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                      {formatChatTime(m.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: '0 1rem 0.5rem' }}>
              {showProductPicker && (
                <div className="chat-product-picker">
                  <div className="cpp-header">
                    <span>📦 Send a Product</span>
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
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, padding: '0.75rem 1rem', borderTop: '1px solid #E2E8F0', background: '#fff', alignItems: 'center' }}>
              <button type="button" onClick={() => setShowProductPicker(v => !v)} style={{ padding: '0.7rem 0.9rem', background: showProductPicker ? '#0F172A' : '#F1F5F9', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 16 }} title="Send product">
                📦
              </button>
              <input 
                style={{ flex: 1, padding: '0.75rem 1rem', border: '1px solid #CBD5E1', borderRadius: 10, outline: 'none', fontSize: 14 }} 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                placeholder="Type a message to the customer..." 
              />
              <button type="submit" style={{ padding: '0.75rem 1.1rem', background: 'linear-gradient(90deg, #0F172A, #334155)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 14 }}>
            Select a customer chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
