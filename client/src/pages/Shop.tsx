import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

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

interface ShopProps {
  posCashier?: any;
  onPosCheckout?: (cart: any[], total: number) => void;
}

export default function Shop({ posCashier, onPosCheckout }: ShopProps = {}) {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [invoiceHistory, setInvoiceHistory] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activePanel, setActivePanel] = useState<'shop' | 'orders' | 'messages'>('shop');
  const [chatInput, setChatInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Auth states
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({ name: '', phone: '', email: '', password: '' });

  const normalizeCustomer = (raw: any) => {
    if (!raw) return null;
    const id = raw.id || raw._id || raw.customerId || raw.login_id || '';
    const name = raw.name || raw.display_name || raw.displayName || raw.cashier || '';
    const phone = raw.phone || raw.mobile || '';
    const email = raw.email || '';
    const login_id = raw.login_id || raw.loginId || raw.username || email || phone || '';
    return { ...raw, id, name, phone, email, login_id };
  };

  const formatPortalDate = (value: any) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isSameCustomer = (candidate: any, current: any) => {
    if (!candidate || !current) return false;
    const candidateId = String(candidate.customerId || candidate.customer_id || candidate.id || '').trim();
    const currentId = String(current.id || current._id || '').trim();
    const candidateLogin = String(candidate.customerLoginId || candidate.login_id || '').trim().toLowerCase();
    const currentLogin = String(current.login_id || current.email || current.phone || '').trim().toLowerCase();
    const candidateEmail = String(candidate.customerEmail || candidate.email || '').trim().toLowerCase();
    const currentEmail = String(current.email || '').trim().toLowerCase();
    const candidatePhone = String(candidate.customerPhone || candidate.phone || '').trim();
    const currentPhone = String(current.phone || '').trim();
    const candidateName = String(candidate.customerName || candidate.name || '').trim().toLowerCase();
    const currentName = String(current.name || '').trim().toLowerCase();

    return (
      (candidateId && currentId && candidateId === currentId) ||
      (candidateLogin && currentLogin && candidateLogin === currentLogin) ||
      (candidateEmail && currentEmail && candidateEmail === currentEmail) ||
      (candidatePhone && currentPhone && candidatePhone === currentPhone) ||
      (candidateName && currentName && candidateName === currentName)
    );
  };

  const getChatKeys = (current: any) => {
    const keys = [
      current?.id,
      current?._id,
      current?.login_id,
      current?.email,
      current?.phone,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    return Array.from(new Set(keys));
  };

  useEffect(() => {
    if (posCashier) {
      setCustomer(normalizeCustomer(posCashier));
    } else {
      const stored = localStorage.getItem('dhakal_customer');
      if (stored) {
        setCustomer(normalizeCustomer(JSON.parse(stored)));
      }
    }
    
    // Fetch products
    fetch(`${API_URL}/api/customer/products`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProducts(data.products);
        }
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const customerId = customer?.id || customer?._id;
    if (!customerId) {
      setOrderHistory([]);
      setInvoiceHistory([]);
      setMessages([]);
      return;
    }

    const chatKeys = getChatKeys(customer);

    // Load customer order history
    fetch(`${API_URL}/api/customer/orders`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const allOrders = Array.isArray(data.orders) ? data.orders : [];
          setOrderHistory(allOrders.filter((order: any) => String(order.customerId || order.customer_id || '') === String(customerId)));
        }
      })
      .catch(err => console.error('Failed to load customer orders', err));

    const salesEndpoints = API_URL
      ? [`${API_URL}/api/sales`, `${API_URL}/api/pos/sales`]
      : ['/api/sales'];

    const loadSalesHistory = async () => {
      for (const endpoint of salesEndpoints) {
        try {
          const res = await fetch(endpoint);
          if (!res.ok) continue;
          const data = await res.json();
          if (!data.success || !Array.isArray(data.sales)) continue;
          const matchedSales = data.sales.filter((sale: any) => isSameCustomer(sale, customer));
          setInvoiceHistory(matchedSales);
          return;
        } catch (err) {
          console.error('Failed to load customer invoices', err);
        }
      }
      setInvoiceHistory([]);
    };

    void loadSalesHistory();

    // Load customer chat history
    const loadCustomerMessages = async () => {
      const merged: any[] = [];
      const seen = new Set<string>();

      for (const key of chatKeys.length > 0 ? chatKeys : [String(customerId)]) {
        try {
          const res = await fetch(`${API_URL}/api/chats/${encodeURIComponent(key)}`);
          if (!res.ok) continue;
          const data = await res.json();
          if (!data.success || !Array.isArray(data.chats)) continue;

          data.chats.forEach((msg: any) => {
            const uniqueKey = `${msg.id || ''}|${msg.timestamp || ''}|${msg.sender || ''}|${msg.message || ''}|${msg.customerId || msg.customer_id || ''}`;
            if (!seen.has(uniqueKey)) {
              seen.add(uniqueKey);
              merged.push(msg);
            }
          });
        } catch (err) {
          console.error('Failed to load customer messages', err);
        }
      }

      merged.sort((a, b) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime());
      setMessages(merged);
    };

    void loadCustomerMessages();

    // Live chat socket so messages sent from customer portal reach admin panel
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
      setSocket(null);
    };
  }, [customer]);

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/customer/login' : '/api/customer/register';
    const payload = isLogin 
      ? { login_id: authData.email || authData.phone, password: authData.password }
      : authData;

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        const custData = normalizeCustomer(isLogin
          ? data.customer
          : { id: data.customerId, name: data.name, email: authData.email, phone: authData.phone, login_id: authData.email || authData.phone }
        );
        setCustomer(custData);
        localStorage.setItem('dhakal_customer', JSON.stringify(custData));
        setShowAuth(false);
      } else {
        alert(data.message || data.error);
      }
    } catch (err) {
      alert('Authentication failed');
    }
  };

  const checkout = async () => {
    if (!customer) {
      setShowAuth(true);
      return;
    }
    if (cart.length === 0) return alert('Cart is empty');

    const total = cart.reduce((acc, item) => acc + (item.sellingPrice * item.qty), 0);
    
    if (onPosCheckout) {
      onPosCheckout(cart, total);
      setCart([]);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/customer/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          login_id: customer.login_id,
          items: cart,
          total
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Order placed successfully! ID: ' + data.orderId);
        setCart([]);
        setActivePanel('orders');
        const customerId = customer?.id || customer?._id;
        if (customerId) {
          fetch(`${API_URL}/api/customer/orders`)
            .then(res => res.json())
            .then(data2 => {
              if (data2.success) {
                const allOrders = Array.isArray(data2.orders) ? data2.orders : [];
                setOrderHistory(allOrders.filter((order: any) => String(order.customerId || order.customer_id || '') === String(customerId)));
              }
            })
            .catch(() => {});
        }
      } else {
        alert('Failed to place order');
      }
    } catch (err) {
      alert('Error placing order');
    }
  };

  const sendPortalMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !customer) return;
    const chatId = customer?.id || customer?._id || customer?.login_id || customer?.email || customer?.phone;
    const payload = {
      customerId: String(chatId || ''),
      sender: 'customer',
      message: chatInput.trim(),
    };

    const optimisticMessage = { ...payload, timestamp: new Date().toISOString(), id: `tmp-${Date.now()}` };
    setMessages(prev => [...prev, optimisticMessage]);
    setChatInput('');

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
          setMessages(prev => prev.map(msg => msg.id === optimisticMessage.id ? (data.chat || msg) : msg));
        }
      })
      .catch(() => {});
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Customer Portal - Shop</h1>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          {customer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <p style={{ margin: 0 }}>Welcome, <strong>{customer.name || 'Customer'}</strong></p>
              <button onClick={() => setActivePanel('shop')} style={{ padding: '0.35rem 0.8rem' }}>Shop</button>
              <button onClick={() => setActivePanel('orders')} style={{ padding: '0.35rem 0.8rem' }}>Order History</button>
              <button onClick={() => setActivePanel('messages')} style={{ padding: '0.35rem 0.8rem' }}>Messages</button>
              <button onClick={() => { setCustomer(null); localStorage.removeItem('dhakal_customer'); setOrderHistory([]); setMessages([]); }}>
                Logout
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)}>Login / Register</button>
          )}
        </div>
      </div>

      {customer && activePanel === 'orders' && (
        <div style={{ background: '#f8fafc', padding: '1rem', marginBottom: '2rem', borderRadius: '8px', border: '1px solid #dbeafe' }}>
          <h2 style={{ marginTop: 0 }}>Order / Invoice History</h2>
          {orderHistory.length === 0 && invoiceHistory.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {[...invoiceHistory.map((sale) => ({ ...sale, __source: 'invoice' })), ...orderHistory.map((order) => ({ ...order, __source: 'order' }))]
                .sort((a, b) => {
                  const aTime = new Date(a.created_at || a.date || 0).getTime();
                  const bTime = new Date(b.created_at || b.date || 0).getTime();
                  return bTime - aTime;
                })
                .map((entry) => (
                <div key={`${entry.__source}-${entry.id}`} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{entry.id}</strong>
                    <span>{entry.__source === 'invoice' ? 'Invoice' : (entry.status || 'pending')}</span>
                  </div>
                  <div style={{ fontSize: 14, marginTop: 6 }}>
                    <div><strong>Total:</strong> NRS {entry.total}</div>
                    <div><strong>Date:</strong> {formatPortalDate(entry.created_at || entry.date)}</div>
                    <div><strong>Items:</strong> {Array.isArray(entry.items) ? entry.items.map((i: any) => `${i.name || i.productName || 'Item'} x${i.qty || 1}`).join(', ') : entry.items}</div>
                    {entry.__source === 'invoice' && (
                      <div><strong>Cashier:</strong> {entry.cashier || '-'}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {customer && activePanel === 'messages' && (
        <div style={{ background: '#f8fafc', padding: '1rem', marginBottom: '2rem', borderRadius: '8px', border: '1px solid #dbeafe' }}>
          <h2 style={{ marginTop: 0 }}>Messages</h2>
          {messages.length === 0 ? (
            <p>No messages yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ background: msg.sender === 'customer' ? '#dcfce7' : '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{msg.sender === 'customer' ? 'You' : 'Admin'}</strong>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{formatPortalDate(msg.timestamp || msg.createdAt)}</span>
                  </div>
                  <div style={{ marginTop: 6 }}>{msg.message}</div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={sendPortalMessage} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message to support..."
              style={{ flex: 1, padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: 8 }}
            />
            <button type="submit" style={{ padding: '0.75rem 1rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8 }}>
              Send
            </button>
          </form>
        </div>
      )}

      {customer && activePanel === 'shop' && (
        <div style={{ marginBottom: '1rem', color: '#334155', fontSize: 14 }}>
          <strong>Logged in as:</strong> {customer.name || 'Customer'} {customer.phone ? `· ${customer.phone}` : ''}
        </div>
      )}

      {showAuth && (
        <div style={{ background: '#f5f5f5', padding: '1rem', marginBottom: '2rem', borderRadius: '8px' }}>
          <h2>{isLogin ? 'Login' : 'Register'}</h2>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '300px' }}>
            {!isLogin && (
              <input required placeholder="Name" value={authData.name} onChange={e => setAuthData({...authData, name: e.target.value})} />
            )}
            <input placeholder="Email" type="email" value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})} />
            <input placeholder="Phone" value={authData.phone} onChange={e => setAuthData({...authData, phone: e.target.value})} />
            <input required placeholder="Password" type="password" value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})} />
            <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
          </form>
          <button onClick={() => setIsLogin(!isLogin)} style={{ marginTop: '0.5rem' }}>
            Switch to {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ flex: 2 }}>
          <h2>Products</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {products.map(p => (
              <div key={p.id} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px', width: '200px' }}>
                <div style={{ fontSize: '2rem', textAlign: 'center' }}>{p.emoji}</div>
                <h3>{p.nameEn}</h3>
                <p>NRS {p.sellingPrice} / {p.unit}</p>
                <button onClick={() => addToCart(p)} style={{ width: '100%', padding: '0.5rem', background: '#e02828', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add to Cart</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, borderLeft: '1px solid #ccc', paddingLeft: '1rem' }}>
          <h2>Your Cart</h2>
          {cart.length === 0 ? <p>Cart is empty</p> : (
            <div>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                  <div>
                    <strong>{item.nameEn}</strong><br/>
                    {item.qty} x NRS {item.sellingPrice}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    NRS {item.qty * item.sellingPrice}<br/>
                    <button onClick={() => removeFromCart(item.id)} style={{ fontSize: '0.8rem', color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Remove</button>
                  </div>
                </div>
              ))}
              <h3 style={{ textAlign: 'right' }}>Total: NRS {cart.reduce((a, b) => a + (b.sellingPrice * b.qty), 0)}</h3>
              <button onClick={checkout} style={{ width: '100%', padding: '1rem', background: 'green', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem' }}>
                Checkout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
