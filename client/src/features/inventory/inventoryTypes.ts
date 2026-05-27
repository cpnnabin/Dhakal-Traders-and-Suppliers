export interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  brand?: string;
  unit?: string;
  costPrice?: number;
  sellingPrice?: number;
  stock?: number;
  minStock?: number;
  createdAt?: string;
  imageUrl?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
}

export interface StockEntry {
  id: string;
  productId: string;
  warehouseId?: string;
  qty: number;
  type: 'in' | 'out';
  date: string;
  note?: string;
}
