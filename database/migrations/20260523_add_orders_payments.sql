PRAGMA foreign_keys = ON;

-- Orders (separate from legacy `sales` for workflow / draft order support)
CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  cashier       TEXT,
  customerId    TEXT,
  customerName  TEXT,
  status        TEXT DEFAULT 'draft', /* draft | confirmed | cancelled */
  subtotal      REAL NOT NULL DEFAULT 0,
  discount      REAL NOT NULL DEFAULT 0,
  tax           REAL NOT NULL DEFAULT 0,
  total         REAL NOT NULL DEFAULT 0,
  date          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   TEXT NOT NULL,
  product_id TEXT NOT NULL,
  nameEn     TEXT,
  qty        REAL NOT NULL DEFAULT 0,
  unit       TEXT,
  price      REAL NOT NULL DEFAULT 0,
  total      REAL NOT NULL DEFAULT 0,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Payments that can apply to sales/purchases/orders
CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  entity_type  TEXT NOT NULL, -- 'sale' | 'purchase' | 'order'
  entity_id    TEXT NOT NULL,
  amount       REAL NOT NULL,
  method       TEXT NOT NULL DEFAULT 'Cash',
  reference    TEXT,
  date         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Receipts issued for sales (lightweight)
CREATE TABLE IF NOT EXISTS receipts (
  id         TEXT PRIMARY KEY,
  sale_id    TEXT NOT NULL,
  printed_by TEXT,
  issued_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- View: compute simple party balance aggregation (customers & suppliers)
CREATE VIEW IF NOT EXISTS party_balance AS
SELECT
  coalesce(s.customerId, p.supplier, 'cash') AS party_id,
  coalesce(s.customerName, p.supplier, 'Cash')           AS party_name,
  SUM(CASE WHEN s.total IS NOT NULL THEN s.total ELSE 0 END) AS sales_total,
  SUM(CASE WHEN p.total IS NOT NULL THEN p.total ELSE 0 END) AS purchases_total
FROM sales s
LEFT JOIN purchases p ON 1=0
GROUP BY party_id;

-- Trigger: when a confirmed sale is inserted into `sales`, decrement product stock
-- Assumes `sales.items` is JSON array with {id, qty} objects and JSON1 functions are available.
CREATE TRIGGER IF NOT EXISTS trg_sales_after_insert
AFTER INSERT ON sales
WHEN NEW.items IS NOT NULL
BEGIN
  UPDATE products
  SET stock = stock - (
    SELECT COALESCE(SUM(json_extract(value, '$.qty')),0)
    FROM json_each(NEW.items)
    WHERE json_extract(value, '$.id') = products.id
  )
  WHERE EXISTS (
    SELECT 1 FROM json_each(NEW.items) WHERE json_extract(value, '$.id') = products.id
  );
END;

-- Trigger: when a purchase is inserted, increment product stock
CREATE TRIGGER IF NOT EXISTS trg_purchases_after_insert
AFTER INSERT ON purchases
WHEN NEW.items IS NOT NULL
BEGIN
  UPDATE products
  SET stock = stock + (
    SELECT COALESCE(SUM(json_extract(value, '$.qty')),0)
    FROM json_each(NEW.items)
    WHERE json_extract(value, '$.id') = products.id
  )
  WHERE EXISTS (
    SELECT 1 FROM json_each(NEW.items) WHERE json_extract(value, '$.id') = products.id
  );
END;

-- Safety: do not allow negative stock if you prefer this invariant
CREATE TRIGGER IF NOT EXISTS trg_products_prevent_negative_stock
BEFORE UPDATE ON products
WHEN NEW.stock < 0
BEGIN
  SELECT RAISE(ABORT, 'stock would become negative');
END;

-- Optional indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_orders_date      ON orders(date);
CREATE INDEX IF NOT EXISTS idx_order_items_pid   ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_payments_entity   ON payments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_receipts_saleid   ON receipts(sale_id);
