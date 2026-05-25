-- Migration: create inventory-related tables
CREATE TABLE IF NOT EXISTS inventory_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  batch_no TEXT,
  qty INTEGER DEFAULT 0,
  manufacture_date TEXT,
  expiry_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  warehouseId TEXT,
  batchId TEXT,
  qty INTEGER NOT NULL,
  type TEXT NOT NULL, -- in|out|adjustment|transfer|damage
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS damage_stock (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  qty INTEGER NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
