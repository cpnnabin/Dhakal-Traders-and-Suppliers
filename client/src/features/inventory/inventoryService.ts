import { Product, StockEntry } from './inventoryTypes';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function safeFetch(path: string, opts?: RequestInit) {
  try {
    const url = (API || '') ? `${API}${path}` : path;
    // attach POS token if available
    const token = sessionStorage.getItem('dt_pos_token') || '';
    const headers = new Headers(opts && opts.headers ? opts.headers as HeadersInit : undefined);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const mergedOpts: RequestInit = { ...(opts || {}), headers };
    const res = await fetch(url, mergedOpts);
    if (res.status === 401) {
      // clear pos session and redirect to POS login
      sessionStorage.removeItem('dt_pos_token');
      sessionStorage.removeItem('dt_pos_cashier');
      sessionStorage.removeItem('dt_pos_role');
      sessionStorage.removeItem('dt_pos_username');
      try { window.location.hash = '#pos'; } catch (e) {}
      return null;
    }
    if (!res.ok) throw new Error('Network');
    return res.json();
  } catch (e) {
    return null;
  }
}

export const inventoryService = {
  async listProducts(): Promise<Product[]> {
    const j = await safeFetch('/api/products');
    if (j && j.success && Array.isArray(j.products)) return j.products.map((p: any) => ({ id: p.id, name: p.nameEn || p.name || '', sku: p.sku || '', category: p.category || '', brand: '', unit: p.unit || '', costPrice: p.purchasePrice || 0, sellingPrice: p.sellingPrice || 0, stock: p.stock || 0, minStock: p.minStock || 0, imageUrl: p.imageUrl || p.image || '' }));
    // fallback to localStorage
    try { const raw = localStorage.getItem('dt_inventory_products'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  },
  async getProduct(id: string): Promise<Product | undefined> {
    const j = await safeFetch(`/api/products/${encodeURIComponent(id)}`);
    if (j && j.success) return j.product;
    try { const raw = localStorage.getItem('dt_inventory_products'); if (!raw) return undefined; const arr = JSON.parse(raw); return arr.find((p: any) => p.id === id); } catch { return undefined; }
  },
  async createProduct(p: Product): Promise<Product> {
    const body = {
      id: p.id, nameEn: p.name, nameNe: p.name, category: p.category || '', stock: p.stock || 0, unit: p.unit || '', purchasePrice: p.costPrice || 0, sellingPrice: p.sellingPrice || 0, emoji: '📦', minStock: p.minStock || 0, imageUrl: p.imageUrl || ''
    };
    const j = await safeFetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (j && j.success) return j.product;
    // fallback to local
    try { const raw = localStorage.getItem('dt_inventory_products'); const arr = raw ? JSON.parse(raw) : []; arr.push(p); localStorage.setItem('dt_inventory_products', JSON.stringify(arr)); return p; } catch { return p; }
  },
  async updateProduct(id: string, patch: Partial<Product>): Promise<Product | undefined> {
    const j = await safeFetch(`/api/products/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (j && j.success) return j.product;
    try { const raw = localStorage.getItem('dt_inventory_products'); if (!raw) return undefined; const arr = JSON.parse(raw); const idx = arr.findIndex((x: any) => x.id === id); if (idx === -1) return undefined; arr[idx] = { ...arr[idx], ...patch }; localStorage.setItem('dt_inventory_products', JSON.stringify(arr)); return arr[idx]; } catch { return undefined; }
  },
  async deleteProduct(id: string): Promise<boolean> {
    const j = await safeFetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (j && j.success) return true;
    try { const raw = localStorage.getItem('dt_inventory_products'); if (!raw) return false; let arr = JSON.parse(raw); const before = arr.length; arr = arr.filter((x: any) => x.id !== id); localStorage.setItem('dt_inventory_products', JSON.stringify(arr)); return arr.length < before; } catch { return false; }
  },

  async listStock(): Promise<StockEntry[]> {
    const j = await safeFetch('/api/stock');
    if (j && j.success && Array.isArray(j.entries)) return j.entries;
    try { const raw = localStorage.getItem('dt_inventory_stock'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  },
  async createStock(entry: StockEntry): Promise<StockEntry> {
    const j = await safeFetch('/api/stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    if (j && j.success) return j.entry;
    try { const raw = localStorage.getItem('dt_inventory_stock'); const arr = raw ? JSON.parse(raw) : []; arr.push(entry); localStorage.setItem('dt_inventory_stock', JSON.stringify(arr)); // update product local
      const rawP = localStorage.getItem('dt_inventory_products'); const prods = rawP ? JSON.parse(rawP) : []; const prod = prods.find((p: any) => p.id === entry.productId); if (prod) { prod.stock = (prod.stock || 0) + (entry.type === 'in' ? entry.qty : -entry.qty); localStorage.setItem('dt_inventory_products', JSON.stringify(prods)); }
      return entry;
    } catch { return entry; }
  }
  ,
  // categories
  async listCategories() {
    const j = await safeFetch('/api/inventory/categories');
    if (j && j.success) return j.categories;
    try { const raw = localStorage.getItem('dt_inventory_categories'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  },
  async createCategory(cat: { id: string; name: string; description?: string }) {
    const j = await safeFetch('/api/inventory/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cat) });
    if (j && j.success) return j.category;
    try { const raw = localStorage.getItem('dt_inventory_categories'); const arr = raw ? JSON.parse(raw) : []; arr.push(cat); localStorage.setItem('dt_inventory_categories', JSON.stringify(arr)); return cat; } catch { return cat; }
  },
  // brands
  async listBrands() {
    const j = await safeFetch('/api/inventory/brands');
    if (j && j.success) return j.brands;
    try { const raw = localStorage.getItem('dt_inventory_brands'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  },
  async createBrand(b: { id: string; name: string; description?: string }) {
    const j = await safeFetch('/api/inventory/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    if (j && j.success) return j.brand;
    try { const raw = localStorage.getItem('dt_inventory_brands'); const arr = raw ? JSON.parse(raw) : []; arr.push(b); localStorage.setItem('dt_inventory_brands', JSON.stringify(arr)); return b; } catch { return b; }
  },
  // warehouses
  async listWarehouses() {
    const j = await safeFetch('/api/inventory/warehouses');
    if (j && j.success) return j.warehouses;
    try { const raw = localStorage.getItem('dt_inventory_warehouses'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  },
  async createWarehouse(w: { id: string; name: string; location?: string }) {
    const j = await safeFetch('/api/inventory/warehouses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(w) });
    if (j && j.success) return j.warehouse;
    try { const raw = localStorage.getItem('dt_inventory_warehouses'); const arr = raw ? JSON.parse(raw) : []; arr.push(w); localStorage.setItem('dt_inventory_warehouses', JSON.stringify(arr)); return w; } catch { return w; }
  },
  // per-warehouse stock
  async listWarehouseStock(productId?: string, warehouseId?: string) {
    const qs: string[] = [];
    if (productId) qs.push(`productId=${encodeURIComponent(productId)}`);
    if (warehouseId) qs.push(`warehouseId=${encodeURIComponent(warehouseId)}`);
    const path = `/api/inventory/warehouse-stock${qs.length ? ('?' + qs.join('&')) : ''}`;
    const j = await safeFetch(path);
    if (j && j.success) return j.rows || [];
    return [];
  },
  async setWarehouseStock(productId: string, warehouseId: string, qty: number) {
    const body = { productId, warehouseId, qty };
    const j = await safeFetch('/api/inventory/warehouse-stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (j && j.success) return j.row;
    return null;
  },
  // seed
  async seedInventory() {
    const j = await safeFetch('/api/inventory/seed', { method: 'POST' });
    return j && j.success;
  }
  ,
  // batches
  async listBatches(productId?: string) {
    const q = productId ? `/api/inventory/batches?productId=${encodeURIComponent(productId)}` : '/api/inventory/batches';
    const j = await safeFetch(q);
    if (j && j.success) return j.batches;
    try { const raw = localStorage.getItem('dt_inventory_batches'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  },
  async createBatch(batch: any) {
    const j = await safeFetch('/api/inventory/batches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batch) });
    if (j && j.success) return j.batch;
    try { const raw = localStorage.getItem('dt_inventory_batches'); const arr = raw ? JSON.parse(raw) : []; arr.push(batch); localStorage.setItem('dt_inventory_batches', JSON.stringify(arr)); return batch; } catch { return batch; }
  },
  async checkExpiry(days = 30) {
    const j = await safeFetch('/api/inventory/check-expiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days }) });
    if (j && j.success) return j.batches || [];
    return [];
  }
  ,
  // transfer
  async transfer(productId: string, fromWarehouseId: string, toWarehouseId: string, qty: number, note?: string) {
    const id = `tr-${Date.now()}`;
    const body = { id, productId, fromWarehouseId, toWarehouseId, qty, note };
    const j = await safeFetch('/api/inventory/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (j && j.success) return j.transfer;
    return null;
  }
};
