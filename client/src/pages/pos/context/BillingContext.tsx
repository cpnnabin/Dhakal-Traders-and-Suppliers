import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePOS } from '../POSContext';
import { normalizeProduct } from '../posTypes';

// Define the shape of the billing local context
export interface BillingContextProps {
  // UI flash for just added product
  justAddedId: string | null;
  // Loading state during checkout
  checkoutLoading: boolean;
  // Function to remove item from cart
  removeFromCart: (id: string) => void;
  // Stepper
  step: 'select' | 'cart' | 'checkout' | 'receipt';
  setStep: React.Dispatch<React.SetStateAction<'select' | 'cart' | 'checkout' | 'receipt'>>;
  // Shortcuts
  showShortcuts: boolean;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  // Product handling
  activeCat: string;
  setActiveCat: React.Dispatch<React.SetStateAction<string>>;
  scanQuery: string;
  setScanQuery: React.Dispatch<React.SetStateAction<string>>;
  filteredProducts: any[];
  // Cart handling
  cart: any[];
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
  addToCart: (prod: any, qty?: number) => void;
  updateQty: (id: string, delta: number) => void;
  setItemDiscount: (id: string, pct: number) => void;
  // Checkout handling
  paymentMode: string;
  setPaymentMode: React.Dispatch<React.SetStateAction<string>>;
  amountPaid: string;
  setAmountPaid: React.Dispatch<React.SetStateAction<string>>;
  handleCheckout: (printAfter?: boolean) => Promise<void>;
  // Receipt
  completedSale: any;
  // Utility functions
  showToast: (msg: string, type?: 'ok' | 'err') => void;
  t: (ne: string, en: string) => string;
}

const BillingContext = createContext<BillingContextProps | undefined>(undefined);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    products, setProducts,
    cart, setCart,
    sales, setSales,
    cashier,
    setReceiptData,
    apiCall,
    reloadProducts,
    customers,
    t,
  } = usePOS();

  // --- Local state (extracted from original Billing.tsx) ---
  const [step, setStep] = useState<'select' | 'cart' | 'checkout' | 'receipt'>('select');
  const [activeCat, setActiveCat] = useState('All Items');
  const [scanQuery, setScanQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [completedSale, setCompletedSale] = useState<any>(null);
  // Track just added product ID for UI flash
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  // Checkout loading state
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);

  // ... other state variables omitted for brevity but can be added similarly

  // --- Product filtering (mirrors original logic) ---
  const filteredProducts = useMemo(() => {
    let list = activeCat === 'All Items' ? [...products] : products.filter(p => p.category === activeCat);
    const q = scanQuery.trim().toLowerCase();
    if (q) list = list.filter(p => p.id.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || p.nameNe.includes(q));
    return list;
  }, [products, activeCat, scanQuery]);

  // --- Cart helpers (extracted snippets) ---
  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    console.log(`[${type}] ${msg}`);
  }, []);

  const addToCart = useCallback((prod: any, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === prod.id);
      if (existing) {
        return prev.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { product: prod, quantity: qty, discountPct: 0 }];
    });
    // Trigger flash for just added product
    setJustAddedId(prod.id);
    // Reset flash after a short timeout
    setTimeout(() => setJustAddedId(null), 1500);
    // Placeholder toast
    showToast(`${prod.nameEn || prod.nameNe} added to cart`);
  }, [showToast]);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  }, []);

  const setItemDiscount = useCallback((id: string, pct: number) => {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, discountPct: Math.max(0, Math.min(100, pct)) } : i));
  }, []);



  const handleCheckout = useCallback(async (printAfter = false) => {
    setCheckoutLoading(true);
    try {
      const sale = await apiCall('/sales', 'POST', { /* payload omitted */ });
      if (sale && sale.success) {
        setCompletedSale(sale.sale);
        setCart([]);
        showToast('Sale completed');
      } else {
        showToast('Sale failed', 'err');
      }
    } catch (e) {
      showToast('Checkout error', 'err');
    } finally {
      setCheckoutLoading(false);
    }
  }, [apiCall, showToast]);

  // Additional helper to remove item from cart
  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.product.id !== id));
    showToast('Item removed');
  }, [showToast]);

  // Provide all values to children
  const value: BillingContextProps = {
    step,
    setStep,
    activeCat,
    setActiveCat,
    scanQuery,
    setScanQuery,
    showShortcuts,
    setShowShortcuts,
    filteredProducts,
    cart,
    setCart,
    addToCart,
    updateQty,
    setItemDiscount,
    paymentMode,
    setPaymentMode,
    amountPaid,
    setAmountPaid,
    handleCheckout,
    completedSale,
    showToast,
    t,
    justAddedId,
    checkoutLoading,
    removeFromCart,
  };

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
};

export const useBilling = () => {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within BillingProvider');
  return ctx;
};
