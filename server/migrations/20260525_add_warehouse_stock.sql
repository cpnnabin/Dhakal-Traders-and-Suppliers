-- Migration: add warehouse_stock table for per-warehouse product quantities
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  warehouseId TEXT NOT NULL,
  qty INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);
