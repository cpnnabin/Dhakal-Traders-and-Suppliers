// ─── Shared POS Types ─────────────────────────────────────────────────────────

export interface Product {
  id: string;
  nameEn: string;
  nameNe: string;
  category: 'herbs' | 'grains' | 'supplies' | 'daily';
  stock: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  emoji: string;
  status?: string;
  expiryDate?: string;
  batchNo?: string;
  supplierId?: string;
  image?: string;
  multiUnits?: { unit: string; factor: number; price: number }[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPct: number;
}

export interface FarmerPurchase {
  id: string;
  farmerName: string;
  productName: string;
  qtyKg: number;
  rate: number;
  total: number;
  date: string;
  paymentMode?: string;
  partyId?: string;
  partyType?: 'supplier' | 'customer';
  note?: string;
}

export interface Party {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  panNo?: string;
  type: 'customer' | 'supplier';
  openingBalance?: number;
  createdAt: string;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  partyId: string;
  partyName: string;
  partyType: 'customer' | 'supplier';
  type: 'in' | 'out';
  amount: number;
  mode: string;
  date: string;
  note?: string;
  receiptNo?: string;
  referenceId?: string;
}

export interface SaleRecord {
  id: string;
  items: { 
    productId: string;
    name: string; 
    qty: number; 
    unit: string;
    rate: number; 
    total: number;
    cost?: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  date: string;
  cashier: string;
  paymentMode: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'returned';
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerLoginId?: string;
  customerAddress?: string;
  customerPan?: string;
  customerAlternativeAddress?: string;
  customerAlternativePhone?: string;
  note?: string;
  grossProfit?: number;
  marginPct?: number;
  isReturn?: boolean;
  returnOf?: string;
}

// ─── Default Seed Data ────────────────────────────────────────────────────────

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1001', nameEn: 'Salyan Timur', nameNe: 'सल्यानी टिमुर', category: 'herbs', stock: 320, unit: 'kg', purchasePrice: 280, sellingPrice: 350, emoji: '🫚' },
  { id: '1002', nameEn: 'Local Ginger', nameNe: 'ताजा अदुवा', category: 'herbs', stock: 450, unit: 'kg', purchasePrice: 150, sellingPrice: 210, emoji: '🌿' },
  { id: '1003', nameEn: 'Traditional Hemp Seeds', nameNe: 'परम्परागत भाङ्गो', category: 'herbs', stock: 140, unit: 'kg', purchasePrice: 420, sellingPrice: 500, emoji: '🌾' },
  { id: '1004', nameEn: 'Fresh Garlic', nameNe: 'सल्यानी लसुन', category: 'herbs', stock: 200, unit: 'kg', purchasePrice: 180, sellingPrice: 250, emoji: '🫙' },
  { id: '1005', nameEn: 'Local Red Beans', nameNe: 'स्थानीय सिमी', category: 'herbs', stock: 85, unit: 'kg', purchasePrice: 220, sellingPrice: 290, emoji: '🥫' },
  { id: '1006', nameEn: 'Food Grains', nameNe: 'गुणस्तरीय चामल / दाल', category: 'grains', stock: 650, unit: 'kg', purchasePrice: 70, sellingPrice: 95, emoji: '🌻' },
  { id: '1007', nameEn: 'Mustard Oil', nameNe: 'तोरी तेल', category: 'daily', stock: 240, unit: 'liter', purchasePrice: 210, sellingPrice: 260, emoji: '🍃' },
  { id: '1008', nameEn: 'Daily Spices / Salt', nameNe: 'मसला र नुन', category: 'daily', stock: 310, unit: 'packet', purchasePrice: 35, sellingPrice: 50, emoji: '🧂' },
];

export const INITIAL_PARTIES: Party[] = [
  { id: 'C-001', name: 'Ram Bahadur Basnet', phone: '9841234567', email: 'ram@example.com', address: 'Salyan', type: 'customer', openingBalance: 0, createdAt: '2026-01-01' },
  { id: 'C-002', name: 'Dil Maya Gharti', phone: '9857654321', address: 'Surkhet', type: 'customer', openingBalance: 0, createdAt: '2026-01-15' },
  { id: 'S-001', name: 'Hari Prasad Bhandari', phone: '9800112233', address: 'Dang', type: 'supplier', openingBalance: 0, createdAt: '2026-01-01' },
  { id: 'S-002', name: 'Shiva Herbal Suppliers', phone: '9812345678', address: 'Kathmandu', type: 'supplier', openingBalance: 0, createdAt: '2026-02-01' },
];

export const INITIAL_PURCHASES: FarmerPurchase[] = [
  { id: 'P-101', farmerName: 'Ram Bahadur Basnet', productName: 'ताजा अदुवा', qtyKg: 150, rate: 150, total: 22500, date: '2026-05-18', partyId: 'S-001', partyType: 'supplier' },
  { id: 'P-102', farmerName: 'Dil Maya Gharti', productName: 'सल्यानी टिमुर', qtyKg: 80, rate: 280, total: 22400, date: '2026-05-17', partyId: 'S-002', partyType: 'supplier' },
  { id: 'P-103', farmerName: 'Hari Prasad Bhandari', productName: 'स्थानीय सिमी', qtyKg: 50, rate: 220, total: 11000, date: '2026-05-16', partyId: 'S-001', partyType: 'supplier' },
];

export const INITIAL_PAYMENTS: PaymentRecord[] = [
  { id: 'PAY-001', partyId: 'C-001', partyName: 'Ram Bahadur Basnet', partyType: 'customer', type: 'in', amount: 5000, mode: 'Cash', date: '2026-05-19', note: 'Advance payment', receiptNo: 'RCPT-001' },
  { id: 'PAY-002', partyId: 'S-001', partyName: 'Hari Prasad Bhandari', partyType: 'supplier', type: 'out', amount: 11000, mode: 'Bank Transfer', date: '2026-05-16', referenceId: 'P-103', receiptNo: 'RCPT-002' },
];

export const INITIAL_SALES: SaleRecord[] = [
  {
    id: 'S-9812',
    items: [
      { productId: '1001', name: 'सल्यानी टिमुर', qty: 2, unit: 'kg', rate: 350, total: 700 },
      { productId: '1002', name: 'ताजा अदुवा', qty: 5, unit: 'kg', rate: 210, total: 1050 },
    ],
    subtotal: 1750, discount: 50, tax: 221, total: 1921,
    amountPaid: 1921, amountDue: 0,
    date: '2026-05-19 10:14 AM', cashier: 'Cashier Admin', paymentMode: 'Cash', status: 'completed',
    customerId: 'C-001', customerName: 'Ram Bahadur Basnet'
  },
  {
    id: 'S-9813',
    items: [
      { productId: '1003', name: 'परम्परागत भाङ्गो', qty: 3, unit: 'kg', rate: 500, total: 1500 },
      { productId: '1007', name: 'तोरी तेल', qty: 2, unit: 'liter', rate: 260, total: 520 },
    ],
    subtotal: 2020, discount: 100, tax: 249.6, total: 2169.6,
    amountPaid: 1000, amountDue: 1169.6,
    date: '2026-05-18 04:30 PM', cashier: 'Cashier Admin', paymentMode: 'Credit', status: 'completed',
    customerId: 'C-002', customerName: 'Dil Maya Gharti'
  },
];

// ─── LocalStorage Helpers ─────────────────────────────────────────────────────

export const LS = {
  products: 'dt_pos_products',
  purchases: 'dt_pos_purchases',
  sales: 'dt_pos_sales',
  parties: 'dt_pos_parties',
  payments: 'dt_pos_payments',
};

export function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLS<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
