-- Adds a convenient view combining customers and suppliers with linked login (if any)
CREATE VIEW IF NOT EXISTS parties_with_login AS
SELECT
  'customer' AS party_type,
  c.id AS party_id,
  c.full_name AS party_name,
  c.phone,
  c.email,
  c.login_id,
  l.id AS login_id,
  l.username AS login_username,
  l.full_name AS login_full_name
FROM customers c
LEFT JOIN login l ON c.login_id = l.id
UNION ALL
SELECT
  'supplier' AS party_type,
  s.id AS party_id,
  s.supplier_name AS party_name,
  s.phone,
  s.email,
  s.login_id,
  l.id AS login_id,
  l.username AS login_username,
  l.full_name AS login_full_name
FROM suppliers s
LEFT JOIN login l ON s.login_id = l.id;
