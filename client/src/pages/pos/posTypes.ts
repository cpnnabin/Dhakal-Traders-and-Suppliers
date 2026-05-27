// ─── Shared POS Types ─────────────────────────────────────────────────────────

export interface Product {
  id: string;
  barcode?: string;
  nameEn: string;
  nameNe: string;
  category: 'herbs' | 'grains' | 'supplies' | 'daily';
  stock: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  taxPercent?: number;
  minStock?: number;
  emoji: string;
  status?: string;
  expiryDate?: string;
  batchNo?: string;
  supplierId?: string;
  image?: string;
  imageUrl?: string;
  multiUnits?: { unit: string; factor: number; price: number }[];
  login_id?: number;
  created_at?: string;
  name_en?: string;
  name_ne?: string;
  purchase_price?: number;
  selling_price?: number;
  tax_percent?: number;
  min_stock?: number;
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
  items?: { productId: string; productName: string; qtyKg: number; rate: number; total: number }[];
  bill_no?: string;
  supplierId?: string;
  login_id?: number;
  warehouse_id?: number;
  purchase_date?: string;
  gross_amount?: number;
  discount_amount?: number;
  taxable_amount?: number;
  vat_amount?: number;
  net_amount?: number;
  paid_amount?: number;
  due_amount?: number;
  created_at?: string;
}

export interface Party {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  panNo?: string;
  pan?: string;
  type: 'customer' | 'supplier';
  openingBalance?: number;
  createdAt: string;
  notes?: string;
  login_id?: number;
  customer_code?: string;
  supplier_code?: string;
  full_name?: string;
  pan_no?: string;
  loyalty_points?: number;
  opening_balance?: number;
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
  invoice_no?: string;
  customer_id?: number;
  login_id?: number;
  warehouse_id?: number;
  bill_date?: string;
  miti?: string;
  payment_mode?: string;
  gross_amount?: number;
  discount_amount?: number;
  taxable_amount?: number;
  vat_amount?: number;
  net_amount?: number;
  paid_amount?: number;
  due_amount?: number;
  tender_amount?: number;
  change_amount?: number;
  total_qty?: number;
  loyalty_point_earned?: number;
  loyalty_total_points?: number;
  created_at?: string;
}

export interface DbProductRow {
  id: string;
  barcode?: string | null;
  name_en?: string;
  name_ne?: string | null;
  category?: string | null;
  category_name?: string | null;
  stock?: number | string;
  quantity?: number | string;
  unit?: string | null;
  unitShort?: string | null;
  purchase_price?: number | string;
  purchasePrice?: number | string;
  selling_price?: number | string;
  sellingPrice?: number | string;
  tax_percent?: number | string;
  taxPercent?: number | string;
  min_stock?: number | string;
  minStock?: number | string;
  image?: string | null;
  expiry_date?: string | null;
  expiryDate?: string | null;
  status?: string | null;
  login_id?: number | string | null;
  created_at?: string;
}

export interface DbSaleRecordRow {
  id?: number | string;
  invoice_no?: string;
  customer_id?: number | string | null;
  login_id?: number | string | null;
  warehouse_id?: number | string | null;
  bill_date?: string;
  miti?: string | null;
  payment_mode?: string | null;
  gross_amount?: number | string | null;
  discount_amount?: number | string | null;
  taxable_amount?: number | string | null;
  vat_amount?: number | string | null;
  net_amount?: number | string | null;
  paid_amount?: number | string | null;
  due_amount?: number | string | null;
  tender_amount?: number | string | null;
  change_amount?: number | string | null;
  total_qty?: number | string | null;
  loyalty_point_earned?: number | string | null;
  loyalty_total_points?: number | string | null;
  note?: string | null;
  created_at?: string;
  items?: any[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerLoginId?: string;
  customerAddress?: string;
  customerPan?: string;
  customerAlternativeAddress?: string;
  customerAlternativePhone?: string;
  cashier?: string;
  paymentMode?: string;
  amountPaid?: number | string;
  amountDue?: number | string;
  date?: string;
  subtotal?: number | string;
  discount?: number | string;
  tax?: number | string;
  total?: number | string;
  status?: string;
  noteText?: string;
}

export interface DbPurchaseRecordRow {
  id?: number | string;
  bill_no?: string;
  supplier_id?: number | string | null;
  login_id?: number | string | null;
  warehouse_id?: number | string | null;
  purchase_date?: string;
  payment_mode?: string | null;
  gross_amount?: number | string | null;
  discount_amount?: number | string | null;
  taxable_amount?: number | string | null;
  vat_amount?: number | string | null;
  net_amount?: number | string | null;
  paid_amount?: number | string | null;
  due_amount?: number | string | null;
  note?: string | null;
  created_at?: string;
  items?: any[];
  farmerName?: string;
  productName?: string;
  qtyKg?: number | string;
  rate?: number | string;
  total?: number | string;
  date?: string;
  paymentMode?: string;
}

export interface DbPartyRow {
  id: number | string;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  pan_no?: string | null;
  panNo?: string | null;
  customer_code?: string | null;
  supplier_code?: string | null;
  login_id?: number | string | null;
  loyalty_points?: number | string | null;
  opening_balance?: number | string | null;
  openingBalance?: number | string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

const asNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const asString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value);
  return text.length ? text : fallback;
};

export function normalizeProduct(row: DbProductRow | Product): Product {
  const category = String((row as any).category || (row as any).category_name || 'supplies').toLowerCase() as Product['category'];
  return {
    id: asString(row.id),
    barcode: row.barcode || undefined,
    nameEn: asString((row as any).nameEn || row.name_en),
    nameNe: asString((row as any).nameNe || row.name_ne),
    category: (['herbs', 'grains', 'supplies', 'daily'].includes(category) ? category : 'supplies') as Product['category'],
    stock: asNumber((row as any).stock ?? (row as any).quantity, 0),
    unit: asString((row as any).unit || (row as any).unitShort, ''),
    purchasePrice: asNumber((row as any).purchasePrice ?? row.purchase_price, 0),
    sellingPrice: asNumber((row as any).sellingPrice ?? row.selling_price, 0),
    taxPercent: asNumber((row as any).taxPercent ?? row.tax_percent, 13),
    minStock: asNumber((row as any).minStock ?? row.min_stock, 0),
    emoji: asString((row as any).emoji, '📦'),
    status: asString((row as any).status, 'active'),
    expiryDate: asString((row as any).expiryDate ?? (row as any).expiry_date, ''),
    batchNo: asString((row as any).batchNo, ''),
    supplierId: (row as any).supplierId ? asString((row as any).supplierId) : undefined,
    image: row.image || undefined,
    imageUrl: (row as any).imageUrl || row.image || undefined,
    multiUnits: (row as any).multiUnits,
    login_id: (row as any).login_id === undefined || (row as any).login_id === null ? undefined : asNumber((row as any).login_id),
    created_at: asString((row as any).created_at, ''),
    name_en: row.name_en,
    name_ne: row.name_ne || undefined,
    purchase_price: row.purchase_price === undefined ? undefined : asNumber(row.purchase_price),
    selling_price: row.selling_price === undefined ? undefined : asNumber(row.selling_price),
    tax_percent: row.tax_percent === undefined ? undefined : asNumber(row.tax_percent),
    min_stock: row.min_stock === undefined ? undefined : asNumber(row.min_stock),
  };
}

export function normalizeSaleRecord(row: DbSaleRecordRow): SaleRecord {
  const invoice = asString(row.invoice_no || row.id);
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    id: invoice,
    invoice_no: row.invoice_no || invoice,
    customerId: row.customer_id === null || row.customer_id === undefined ? undefined : asString(row.customer_id),
    items: items.map((item: any) => ({
      productId: asString(item.productId || item.product_id),
      name: asString(item.name || item.product_name || item.nameEn),
      qty: asNumber(item.qty || item.quantity, 0),
      unit: asString(item.unit, ''),
      rate: asNumber(item.rate || item.price, 0),
      total: asNumber(item.total || item.amount, 0),
      cost: item.cost === undefined ? undefined : asNumber(item.cost),
    })),
    subtotal: asNumber(row.subtotal ?? row.taxable_amount ?? row.gross_amount, 0),
    discount: asNumber(row.discount ?? row.discount_amount, 0),
    tax: asNumber(row.tax ?? row.vat_amount, 0),
    total: asNumber(row.total ?? row.net_amount, 0),
    amountPaid: asNumber(row.amountPaid ?? row.paid_amount, 0),
    amountDue: asNumber(row.amountDue ?? row.due_amount, 0),
    date: asString(row.date || row.bill_date || row.created_at, ''),
    cashier: asString(row.cashier || row.login_id, ''),
    paymentMode: asString(row.paymentMode || row.payment_mode, 'Cash'),
    status: ((row.status as SaleRecord['status']) || 'completed'),
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    customerLoginId: row.customerLoginId,
    customerAddress: row.customerAddress,
    customerPan: row.customerPan,
    customerAlternativeAddress: row.customerAlternativeAddress,
    customerAlternativePhone: row.customerAlternativePhone,
    note: row.note || row.noteText || undefined,
    grossProfit: (row as any).grossProfit === undefined ? undefined : asNumber((row as any).grossProfit),
    marginPct: (row as any).marginPct === undefined ? undefined : asNumber((row as any).marginPct),
    isReturn: Boolean((row as any).isReturn),
    returnOf: (row as any).returnOf,
    login_id: row.login_id === undefined || row.login_id === null ? undefined : asNumber(row.login_id),
    warehouse_id: row.warehouse_id === undefined || row.warehouse_id === null ? undefined : asNumber(row.warehouse_id),
    bill_date: row.bill_date,
    miti: row.miti || undefined,
    payment_mode: row.payment_mode || undefined,
    gross_amount: row.gross_amount === undefined || row.gross_amount === null ? undefined : asNumber(row.gross_amount),
    discount_amount: row.discount_amount === undefined || row.discount_amount === null ? undefined : asNumber(row.discount_amount),
    taxable_amount: row.taxable_amount === undefined || row.taxable_amount === null ? undefined : asNumber(row.taxable_amount),
    vat_amount: row.vat_amount === undefined || row.vat_amount === null ? undefined : asNumber(row.vat_amount),
    net_amount: row.net_amount === undefined || row.net_amount === null ? undefined : asNumber(row.net_amount),
    paid_amount: row.paid_amount === undefined || row.paid_amount === null ? undefined : asNumber(row.paid_amount),
    due_amount: row.due_amount === undefined || row.due_amount === null ? undefined : asNumber(row.due_amount),
    tender_amount: row.tender_amount === undefined || row.tender_amount === null ? undefined : asNumber(row.tender_amount),
    change_amount: row.change_amount === undefined || row.change_amount === null ? undefined : asNumber(row.change_amount),
    total_qty: row.total_qty === undefined || row.total_qty === null ? undefined : asNumber(row.total_qty),
    loyalty_point_earned: row.loyalty_point_earned === undefined || row.loyalty_point_earned === null ? undefined : asNumber(row.loyalty_point_earned),
    loyalty_total_points: row.loyalty_total_points === undefined || row.loyalty_total_points === null ? undefined : asNumber(row.loyalty_total_points),
    created_at: row.created_at,
  };
}

export function normalizePurchaseRecord(row: DbPurchaseRecordRow): FarmerPurchase {
  const billNo = asString(row.bill_no || row.id);
  const items = Array.isArray(row.items) ? row.items : [];
  const firstItem = items[0] || {};
  return {
    id: billNo,
    bill_no: row.bill_no || billNo,
    farmerName: asString(row.farmerName || row.note || ''),
    productName: asString(row.productName || firstItem.productName || firstItem.product_name || ''),
    qtyKg: asNumber(row.qtyKg ?? firstItem.qtyKg ?? firstItem.qty ?? 0, 0),
    rate: asNumber(row.rate ?? firstItem.rate ?? 0, 0),
    total: asNumber(row.total ?? row.net_amount, 0),
    date: asString(row.date || row.purchase_date || row.created_at, ''),
    paymentMode: asString(row.paymentMode || row.payment_mode || 'Cash'),
    note: row.note || undefined,
    supplierId: row.supplier_id === null || row.supplier_id === undefined ? undefined : asString(row.supplier_id),
    login_id: row.login_id === undefined || row.login_id === null ? undefined : asNumber(row.login_id),
    warehouse_id: row.warehouse_id === undefined || row.warehouse_id === null ? undefined : asNumber(row.warehouse_id),
    purchase_date: row.purchase_date,
    gross_amount: row.gross_amount === undefined || row.gross_amount === null ? undefined : asNumber(row.gross_amount),
    discount_amount: row.discount_amount === undefined || row.discount_amount === null ? undefined : asNumber(row.discount_amount),
    taxable_amount: row.taxable_amount === undefined || row.taxable_amount === null ? undefined : asNumber(row.taxable_amount),
    vat_amount: row.vat_amount === undefined || row.vat_amount === null ? undefined : asNumber(row.vat_amount),
    net_amount: row.net_amount === undefined || row.net_amount === null ? undefined : asNumber(row.net_amount),
    paid_amount: row.paid_amount === undefined || row.paid_amount === null ? undefined : asNumber(row.paid_amount),
    due_amount: row.due_amount === undefined || row.due_amount === null ? undefined : asNumber(row.due_amount),
    created_at: row.created_at,
  };
}

export function normalizeParty(row: DbPartyRow, type: Party['type']): Party {
  const name = asString(row.full_name || row.name || '');
  return {
    id: asString(row.id),
    name,
    phone: row.phone || undefined,
    email: row.email || undefined,
    address: row.address || undefined,
    panNo: row.pan_no || row.panNo || undefined,
    pan: row.pan_no || row.panNo || undefined,
    type,
    openingBalance: asNumber(row.opening_balance ?? row.openingBalance, 0),
    createdAt: asString(row.created_at || row.createdAt, new Date().toISOString()),
    notes: undefined,
    login_id: row.login_id === undefined || row.login_id === null ? undefined : asNumber(row.login_id),
    customer_code: row.customer_code || undefined,
    supplier_code: row.supplier_code || undefined,
    full_name: row.full_name || row.name || undefined,
    pan_no: row.pan_no || undefined,
    loyalty_points: row.loyalty_points === undefined || row.loyalty_points === null ? undefined : asNumber(row.loyalty_points),
    opening_balance: row.opening_balance === undefined || row.opening_balance === null ? undefined : asNumber(row.opening_balance),
  };
}

// Live DB data only: no hardcoded seed records here.

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
