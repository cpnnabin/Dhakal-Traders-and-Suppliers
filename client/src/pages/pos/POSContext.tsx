import React from 'react';
import { useLanguage } from '../../LanguageContext';
import { Product, CartItem, SaleRecord, FarmerPurchase, INITIAL_PRODUCTS, INITIAL_PURCHASES, INITIAL_SALES, loadLS, saveLS, LS } from './posTypes';
import { getPOSSession } from '../POSLogin';

// ─── POS Global State Context ──────────────────────────────────────────────────
// Provides shared state (products, cart, sales, purchases) to all POS sub-pages.

export interface POSContextValue {
  // Products ledger
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;

  // Active billing cart
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;

  // Sales history
  sales: SaleRecord[];
  setSales: React.Dispatch<React.SetStateAction<SaleRecord[]>>;

  // Farmer procurement records
  purchases: FarmerPurchase[];
  setPurchases: React.Dispatch<React.SetStateAction<FarmerPurchase[]>>;

  // Active cashier
  cashier: any;
  setCashier: React.Dispatch<React.SetStateAction<any>>;

  // Cart discount %
  cartDiscount: number;
  setCartDiscount: React.Dispatch<React.SetStateAction<number>>;

  // Hold bills
  holdBills: CartItem[][];
  setHoldBills: React.Dispatch<React.SetStateAction<CartItem[][]>>;

  // Receipt
  receiptData: SaleRecord | null;
  setReceiptData: React.Dispatch<React.SetStateAction<SaleRecord | null>>;
  receiptEditTarget: SaleRecord | null;
  setReceiptEditTarget: React.Dispatch<React.SetStateAction<SaleRecord | null>>;

  // Added Customer and User Management
  customers: any[];
  setCustomers: React.Dispatch<React.SetStateAction<any[]>>;
  users: any[];
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;

  // API Call helper
  apiCall: (endpoint: string, method?: string, body?: any) => Promise<any>;

  // Translation helper
  t: (ne: string, en: string) => string;
}

export const POSContext = React.createContext<POSContextValue | null>(null);

export function usePOS(): POSContextValue {
  const ctx = React.useContext(POSContext);
  if (!ctx) throw new Error('usePOS must be used inside POSProvider');
  return ctx;
}

export function POSProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const t = (ne: string, en: string) => (lang === 'en' ? en : ne);

  const [products,     setProducts]     = React.useState<Product[]>(() => loadLS(LS.products, INITIAL_PRODUCTS));
  const [purchases,    setPurchases]    = React.useState<FarmerPurchase[]>(() => loadLS(LS.purchases, INITIAL_PURCHASES));
  const [sales,        setSales]        = React.useState<SaleRecord[]>(() => loadLS(LS.sales, INITIAL_SALES));
  const [customers,    setCustomers]    = React.useState<any[]>([]);
  const [users,        setUsers]        = React.useState<any[]>([]);
  const [cart,         setCart]         = React.useState<CartItem[]>([]);
  const [cashier,      setCashier]      = React.useState<any>(() => {
    const session = getPOSSession();
    if (!session.token) return null;
    try {
      const parts = session.token.split('.');
      if (parts.length < 2) {
        return {
          id: session.username || session.cashier,
          username: session.username || '',
          name: session.cashier,
          role: session.role || 'cashier',
        };
      }
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      return {
        id: payload.sub,
        username: payload.email || session.username,
        name: payload.name || session.cashier,
        role: payload.role || session.role,
      };
    } catch {
      return {
        id: session.username || session.cashier,
        username: session.username || '',
        name: session.cashier,
        role: session.role || 'cashier',
      };
    }
  });
  const [cartDiscount, setCartDiscount] = React.useState(0);
  const [holdBills,    setHoldBills]    = React.useState<CartItem[][]>([]);
  const [receiptData,  setReceiptData]  = React.useState<SaleRecord | null>(null);
  const [receiptEditTarget, setReceiptEditTarget] = React.useState<SaleRecord | null>(null);

  const apiCall = async (endpoint: string, method = 'GET', body: any = null) => {
    const session = getPOSSession();
    const isLocal =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]' ||
        window.location.hostname === '::1');

    // Express dev server uses /api/pos/* ; Cloudflare Pages Functions use /api/*
    const expressViaProxy = `/api/pos${endpoint}`;
    const expressDirect = `http://localhost:5001/api/pos${endpoint}`;
    const cloudflareUrl = `/api${endpoint}`;

    // In production prefer Cloudflare Pages Functions endpoint only.
    // Falling back to /api/pos (Express) is useful for local dev but
    // on the hosted Pages site those routes often return 405. Keep
    // production calls strictly to /api/* so Cloudflare Functions handle them.
    const urls = isLocal ? [expressViaProxy, expressDirect] : [cloudflareUrl];

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session.token) headers['x-pos-token'] = session.token;

    try {
      const opts: RequestInit = { method, headers };
      if (body) opts.body = JSON.stringify(body);

      let res: Response | null = null;
      let lastErr: unknown = null;

      for (const url of urls) {
        try {
          const attempt = await fetch(url, opts);
          // If this attempt is not OK, and it's not the last candidate URL, try the next one.
          // Previously we only retried on 404 or >=500; that left 405 (Method Not Allowed)
          // responses to short-circuit fallback logic. Treat non-OK (except perhaps auth errors)
          // as retryable so the client will fall back to the alternate endpoint.
          if (!attempt.ok && url !== urls[urls.length - 1]) {
            continue;
          }
          res = attempt;
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!res) {
        return { success: false, offline: true, error: 'API server unavailable' };
      }

      const text = await res.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : { success: false, error: 'Empty response from server.' };
      } catch (parseErr) {
        console.error('Failed to parse response JSON:', text, parseErr);
        throw new Error(t('सर्भरबाट अमान्य प्रतिक्रिया आयो।', 'Invalid response format from server.'));
      }

      // Allow successful HTTP with data even if success flag omitted (legacy responses)
      if (!res.ok) {
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      if (data.success === false) {
        throw new Error(data.error || 'Request failed');
      }
      return { success: true, ...data };
    } catch (error: any) {
      console.warn(`API (${endpoint}):`, error?.message || error);
      return { success: false, offline: true, error: error?.message || String(error) };
    }
  };

  // ── Auto-persist state to localStorage ──────────────────────────────────────
  React.useEffect(() => { saveLS(LS.products,  products);  }, [products]);
  React.useEffect(() => { saveLS(LS.sales,     sales);     }, [sales]);
  React.useEffect(() => { saveLS(LS.purchases, purchases); }, [purchases]);

  React.useEffect(() => {
    const session = getPOSSession();
    
    const fetchData = async () => {
      const pRes = await apiCall('/products');
      if (pRes.success && pRes.products && Array.isArray(pRes.products) && pRes.products.length > 0) {
        setProducts(pRes.products);
        saveLS(LS.products, pRes.products);
      }

      const sRes = await apiCall('/sales');
      if (sRes.success && sRes.sales && Array.isArray(sRes.sales)) {
        setSales(sRes.sales);
        saveLS(LS.sales, sRes.sales);
      }

      const puRes = await apiCall('/purchases');
      if (puRes.success && puRes.purchases && Array.isArray(puRes.purchases)) {
        setPurchases(puRes.purchases);
        saveLS(LS.purchases, puRes.purchases);
      }

      const cRes = await apiCall('/customers');
      if (cRes.success && cRes.customers && Array.isArray(cRes.customers)) {
        setCustomers(cRes.customers);
      }

      const uRes = await apiCall('/users');
      if (uRes.success && uRes.users && Array.isArray(uRes.users)) {
        setUsers(uRes.users);
      }
    };
    fetchData();
  }, []);

  return (
    <POSContext.Provider value={{
      products, setProducts,
      cart, setCart,
      sales, setSales,
      purchases, setPurchases,
      customers, setCustomers,
      users, setUsers,
      cashier, setCashier,
      cartDiscount, setCartDiscount,
      holdBills, setHoldBills,
      receiptData, setReceiptData,
      receiptEditTarget, setReceiptEditTarget,
      apiCall,
      t,
    }}>
      {children}
    </POSContext.Provider>
  );
}
