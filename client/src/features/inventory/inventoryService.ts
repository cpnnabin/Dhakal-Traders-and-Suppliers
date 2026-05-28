import { Product, StockEntry } from './inventoryTypes';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const USE_LOCAL_FALLBACK = String(import.meta.env.VITE_INVENTORY_LOCAL_FALLBACK || '').trim() === '1';

function readCache<T>(key: string): T[] {
  if (!USE_LOCAL_FALLBACK) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCache<T>(key: string, value: T[]) {
  if (!USE_LOCAL_FALLBACK) return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

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
    if (!res.ok) throw new Error(await res.text().catch(() => '') || `Request failed with ${res.status}`);
    return res.json();
  } catch (e) {
    return null;
  }
}

export const inventoryService = {
  async listProducts(): Promise<Product[]> {
    const j = await safeFetch('/api/products');
    if (j && j.success && Array.isArray(j.products)) return j.products.map((p: any) => ({ id: p.id, name: p.nameEn || p.name || '', sku: p.sku || '', category: p.category || '', brand: '', unit: p.unit || '', costPrice: p.purchasePrice || 0, sellingPrice: p.sellingPrice || 0, stock: p.stock || 0, minStock: p.minStock || 0, imageUrl: p.imageUrl || p.image || '' }));
    return readCache<Product>('dt_inventory_products');
  },
  async getProduct(id: string): Promise<Product | undefined> {
    const j = await safeFetch(`/api/products/${encodeURIComponent(id)}`);
    if (j && j.success) return j.product;
    return readCache<Product>('dt_inventory_products').find((p: any) => p.id === id);
  },
  async createProduct(p: Product): Promise<Product> {
    const body = {
      id: p.id, nameEn: p.name, nameNe: p.name, category: p.category || '', stock: p.stock || 0, unit: p.unit || '', purchasePrice: p.costPrice || 0, sellingPrice: p.sellingPrice || 0, emoji: '📦', minStock: p.minStock || 0, imageUrl: p.imageUrl || ''
    };
    const j = await safeFetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (j && j.success) return j.product;
    if (USE_LOCAL_FALLBACK) {
      const arr = readCache<Product>('dt_inventory_products');
      arr.push(p);
      writeCache('dt_inventory_products', arr);
      return p;
    }
    throw new Error('Unable to create product.');
  },
  async updateProduct(id: string, patch: Partial<Product>): Promise<Product | undefined> {
    const j = await safeFetch(`/api/products/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (j && j.success) return j.product;
    if (USE_LOCAL_FALLBACK) {
      const arr = readCache<Product>('dt_inventory_products') as any[];
      const idx = arr.findIndex((x: any) => x.id === id);
      if (idx === -1) return undefined;
      arr[idx] = { ...arr[idx], ...patch };
      writeCache('dt_inventory_products', arr);
      return arr[idx];
    }
    throw new Error('Unable to update product.');
  },
  async deleteProduct(id: string): Promise<boolean> {
    const j = await safeFetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (j && j.success) return true;
    if (USE_LOCAL_FALLBACK) {
      let arr = readCache<Product>('dt_inventory_products') as any[];
      const before = arr.length;
      arr = arr.filter((x: any) => x.id !== id);
      writeCache('dt_inventory_products', arr);
      return arr.length < before;
    }
    throw new Error('Unable to delete product.');
  },

  async listStock(): Promise<StockEntry[]> {
    const j = await safeFetch('/api/stock');
    if (j && j.success && Array.isArray(j.entries)) return j.entries;
    return readCache<StockEntry>('dt_inventory_stock');
  },
  async createStock(entry: StockEntry): Promise<StockEntry> {
    const j = await safeFetch('/api/stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    if (j && j.success) return j.entry;
    if (USE_LOCAL_FALLBACK) {
      const arr = readCache<StockEntry>('dt_inventory_stock');
      arr.push(entry);
      writeCache('dt_inventory_stock', arr);
      return entry;
    }
    throw new Error('Unable to create stock entry.');
  }
  ,
  // categories
  async listCategories() {
    const j = await safeFetch('/api/inventory/categories');
    if (j && j.success) return j.categories;
    return readCache<any>('dt_inventory_categories');
  },
  async createCategory(cat: { id: string; name: string; description?: string }) {
    const j = await safeFetch('/api/inventory/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cat) });
    if (j && j.success) return j.category;
    if (USE_LOCAL_FALLBACK) {
      const arr = readCache<any>('dt_inventory_categories');
      arr.push(cat);
      writeCache('dt_inventory_categories', arr);
      return cat;
    }
    throw new Error('Unable to create category.');
  },
  // brands
  async listBrands() {
    const j = await safeFetch('/api/inventory/brands');
    if (j && j.success) return j.brands;
    return readCache<any>('dt_inventory_brands');
  },
  async createBrand(b: { id: string; name: string; description?: string }) {
    const j = await safeFetch('/api/inventory/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    if (j && j.success) return j.brand;
    if (USE_LOCAL_FALLBACK) {
      const arr = readCache<any>('dt_inventory_brands');
      arr.push(b);
      writeCache('dt_inventory_brands', arr);
      return b;
    }
    throw new Error('Unable to create brand.');
  },
  // warehouses
  async listWarehouses() {
    const j = await safeFetch('/api/inventory/warehouses');
    if (j && j.success) return j.warehouses;
    return readCache<any>('dt_inventory_warehouses');
  },
  async createWarehouse(w: { id: string; name: string; location?: string }) {
    const j = await safeFetch('/api/inventory/warehouses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(w) });
    if (j && j.success) return j.warehouse;
    if (USE_LOCAL_FALLBACK) {
      const arr = readCache<any>('dt_inventory_warehouses');
      arr.push(w);
      writeCache('dt_inventory_warehouses', arr);
      return w;
    }
    throw new Error('Unable to create warehouse.');
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
    return readCache<any>('dt_inventory_batches');
  },
  async createBatch(batch: any) {
    const j = await safeFetch('/api/inventory/batches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batch) });
    if (j && j.success) return j.batch;
    if (USE_LOCAL_FALLBACK) {
      const arr = readCache<any>('dt_inventory_batches');
      arr.push(batch);
      writeCache('dt_inventory_batches', arr);
      return batch;
    }
    throw new Error('Unable to create batch.');
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
