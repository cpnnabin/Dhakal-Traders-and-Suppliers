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

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [customer, setCustomer] = useState<any>(null);

  const normalizeCustomer = (raw: any) => {
    if (!raw) return null;
    const id = raw.id || raw._id || raw.customerId || raw.login_id || '';
    const name = raw.name || raw.display_name || raw.displayName || raw.cashier || '';
    const phone = raw.phone || raw.mobile || '';
    const email = raw.email || '';
    const login_id = raw.login_id || raw.loginId || raw.username || email || phone || '';
    return { ...raw, id, name, phone, email, login_id };
  };

  useEffect(() => {
    const stored = localStorage.getItem('dhakal_customer');
    if (stored) {
      setCustomer(normalizeCustomer(JSON.parse(stored)));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !customer) return;

    // Fetch history
    fetch(`${API_URL}/api/chats/${customer.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessages(Array.isArray(data.chats) ? data.chats : []);
        }
      });

    // Initialize socket
    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_chat', customer.id);
    });

    newSocket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isOpen, customer]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !customer) return;

    const payload = {
      customerId: customer.id,
      sender: 'customer',
      message: input.trim()
    };

    if (socket?.connected) {
      socket.emit('send_message', payload);
      setInput('');
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
          setMessages(prev => [...prev, data.chat || { ...payload, timestamp: new Date().toISOString() }]);
          setInput('');
        }
      })
      .catch(() => {});
  };

  if (!customer) {
    if (!isOpen) return (
      <div style={styles.floatingButton} onClick={() => setIsOpen(true)}>
        💬 Chat
      </div>
    );
    return (
      <div style={styles.chatWindow}>
        <div style={styles.header}>
          Chat Support <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>X</button>
        </div>
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <p>Please login to the Shop first to chat with us.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isOpen && (
        <div style={styles.floatingButton} onClick={() => setIsOpen(true)}>
          💬 Chat
        </div>
      )}
      
      {isOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.header}>
            Support Chat <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>X</button>
          </div>
          
          <div style={styles.messagesContainer}>
            {messages.map((m, i) => (
              <div key={i} style={{ 
                ...styles.message, 
                alignSelf: m.sender === 'customer' ? 'flex-end' : 'flex-start',
                backgroundColor: m.sender === 'customer' ? '#d1e7dd' : '#f8d7da'
              }}>
                <strong>{m.sender === 'customer' ? 'You' : 'Admin'}: </strong>
                {m.message}
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} style={styles.inputArea}>
            <input 
              style={styles.input} 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Type a message..." 
            />
            <button type="submit" style={styles.sendBtn}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  floatingButton: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: '#e02828',
    color: 'white',
    padding: '1rem',
    borderRadius: '50px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 1000,
    fontWeight: 'bold'
  },
  chatWindow: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '300px',
    height: '400px',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    overflow: 'hidden'
  },
  header: {
    backgroundColor: '#e02828',
    color: 'white',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 'bold'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1.2rem'
  },
  messagesContainer: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  message: {
    padding: '0.5rem',
    borderRadius: '8px',
    maxWidth: '80%',
    wordBreak: 'break-word'
  },
  inputArea: {
    display: 'flex',
    padding: '0.5rem',
    borderTop: '1px solid #ccc',
    backgroundColor: '#f9f9f9'
  },
  input: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px'
  },
  sendBtn: {
    marginLeft: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#e02828',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};
