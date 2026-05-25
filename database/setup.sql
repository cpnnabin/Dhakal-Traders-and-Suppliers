-- Enable foreign‑key enforcement (SQLite)
PRAGMA foreign_keys = ON;

-- 1️⃣  DROP ALL EXISTING TABLES (order matters because of FK)
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS login;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS admins;

-- 2️⃣  CREATE TABLES
-- 2a️⃣ admins (system UI admins)
CREATE TABLE admins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    created_at  TEXT    NOT NULL
);

-- 2b️⃣ contacts (Contact‑Us entries)
CREATE TABLE contacts (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL,
    phone     TEXT NOT NULL,
    subject   TEXT NOT NULL,
    message   TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2c️⃣ products catalogue
CREATE TABLE products (
    id            TEXT PRIMARY KEY,
    nameEn        TEXT NOT NULL,
    nameNe        TEXT NOT NULL,
    category      TEXT NOT NULL,
    stock         REAL NOT NULL,
    unit          TEXT NOT NULL,
    purchasePrice REAL NOT NULL,
    sellingPrice  REAL NOT NULL,
    emoji         TEXT DEFAULT '📦',
    status        TEXT DEFAULT 'active'
);

-- 2d️⃣ login / POS users (now with email & PAN)
CREATE TABLE login (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    UNIQUE NOT NULL,
    display_name  TEXT    NOT NULL DEFAULT 'Cashier',
    role          TEXT    NOT NULL DEFAULT 'cashier',
    phone         TEXT,
    password_hash TEXT    NOT NULL,
    address       TEXT,
    alternative_phone TEXT,
    bio           TEXT,
    avatar        TEXT    DEFAULT '👤',
    pan_no        TEXT,
    profile_photo TEXT
);

-- 2e️⃣ customers (optional 1‑to‑1 link to a login record)
CREATE TABLE customers (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    login_id          TEXT UNIQUE,
    name              TEXT NOT NULL,
    phone             TEXT NOT NULL,
    email             TEXT,
    address           TEXT,
    type              TEXT DEFAULT 'retail',
    password          TEXT,
    pan_no            TEXT,
    alternativeAddress TEXT,
    alternativePhone   TEXT,
    created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2f️⃣ sales (POS transactions)
CREATE TABLE sales (
    id                         TEXT PRIMARY KEY,
    items                      TEXT NOT NULL,
    subtotal                   REAL NOT NULL,
    discount                   REAL NOT NULL,
    tax                        REAL NOT NULL,
    total                      REAL NOT NULL,
    date                       TEXT NOT NULL,
    cashier                    TEXT NOT NULL,
    customerId                 TEXT,
    paymentMode                TEXT DEFAULT 'Cash',
    customerName               TEXT,
    customerAddress            TEXT,
    customerPan                TEXT,
    customerAlternativeAddress TEXT,
    customerAlternativePhone    TEXT,
    created_at                 TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2g️⃣ purchases (stock‑in)
CREATE TABLE purchases (
    id          TEXT PRIMARY KEY,
    supplier    TEXT NOT NULL,
    items       TEXT NOT NULL,
    total       REAL NOT NULL,
    date        TEXT NOT NULL,
    paymentMode TEXT DEFAULT 'Cash',
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2h️⃣ transactions (general ledger)
CREATE TABLE transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    entity_id   INTEGER,
    entity_type TEXT NOT NULL,
    type        TEXT NOT NULL,
    ref_no      TEXT,
    debit       REAL DEFAULT 0.00,
    credit      REAL DEFAULT 0.00,
    narration   TEXT,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2i️⃣ accounts (balance‑sheet / chart of accounts)
CREATE TABLE accounts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name     TEXT NOT NULL,
    account_type     TEXT NOT NULL,
    opening_balance REAL DEFAULT 0.00
);

-- 3️⃣  INSERT SEED DATA
-- 3a️⃣ admins
INSERT INTO admins (email, password, created_at)
VALUES ('admin@dhakaltraders.com',
        '$2a$10$tZ261jNpw8s.d.8W50t9zOT3ZpL.r1jJ22Q4j5fTMy6L93Z/M1Q.S',
        CURRENT_TIMESTAMP);

-- 3b️⃣ login / users (passwords: admin123, owner123, cashier123 — see database/D1_SETUP.md)
INSERT INTO login (email, display_name, role, phone, password_hash, address, bio, avatar)
VALUES
    ('admin@dhakaltraders.com','System Admin','admin','9857823400','2eec76506c072a3b80edb95a82c110c7ac1e3eec222aa5efd9f53cb7060e2d7f','Kathmandu','System Administrator','👨💻'),
    ('owner@dhakaltraders.com','Dipak Sharma','owner','9857823400','05f35d7dcd8f96a7fbaaee1900edd20df8b9acd6a8c5efc0d5ffa2da284a516b','Itahari, Nepal','Owner of Dhakal Traders','🧔'),
    ('cashier@dhakaltraders.com','Ram Bahadur','cashier','9847000000','f5a3c7e385121b3ea1279f922ded8c7751dd56fef78a1cf39896ab20f7057717','Dharan','Senior Cashier','👤');

-- 3c️⃣ products (initial two)
INSERT INTO products (id, nameEn, nameNe, category, stock, unit, purchasePrice, sellingPrice, emoji, status)
VALUES
    ('PRD-1001','Organic Timur','अर्गानिक टिमुर','herbs',50,'kg',800,1200,'🌿','active'),
    ('PRD-1002','Raw Honey','काँचो मह','daily',20,'ltr',600,950,'🍯','active');

-- 3d️⃣ extra product catalogue
INSERT OR IGNORE INTO products (id, nameEn, nameNe, category, stock, unit, purchasePrice, sellingPrice, emoji, status)
VALUES
    ('PRD-2001','Timur','टिमुर','herbs',50,'kg',800,1200,'🌿','active'),
    ('PRD-2002','Beans (Simi)','सिमी','grocery',100,'kg',120,150,'🫘','active'),
    ('PRD-2003','Rice (Chamal)','चामल','grocery',500,'sack',1800,2100,'🌾','active'),
    ('PRD-2004','Mustard Oil (Tel)','तोरीको तेल','grocery',200,'ltr',250,300,'🛢️','active'),
    ('PRD-2005','Ginger (Aduwa)','अदुवा','vegetables',80,'kg',150,200,'🫚','active'),
    ('PRD-2006','Flour (Pitho)','पिठो','grocery',300,'kg',60,80,'🥖','active'),
    ('PRD-2007','Sugar (Chini)','चिनी','grocery',400,'kg',90,110,'🍚','active'),
    ('PRD-2008','Soap (Sabun)','साबुन','daily',500,'pcs',35,50,'🧼','active');

-- 3e️⃣ customers (sample rows)
INSERT INTO customers (login_id, name, phone, email, address, type, password, pan_no)
VALUES
    ('shyam123','Shyam Kumar Store','9812345678','shyam@example.com','Biratnagar','wholesale','pass123','123456789'),
    ('hari123','Hari Prasad','9841000111','hari@gmail.com','Kathmandu','retail','hari123','');

-- 3f️⃣ contacts (single entry)
INSERT INTO contacts (name, email, phone, subject, message)
VALUES ('Sita Thapa','sita@test.com','9801122334','timur','I would like to order 50kg of organic timur in bulk.');

-- 3g️⃣ sales (one invoice)
INSERT INTO sales (id, items, subtotal, discount, tax, total, date, cashier, customerId, customerName, paymentMode)
VALUES ('INV-50001','[{"id":"PRD-1001","nameEn":"Organic Timur","nameNe":"अर्गानिक टिमुर","price":1200,"qty":2,"total":2400}]',2400,0,0,2400,CURRENT_TIMESTAMP,'Ram Bahadur','1','Shyam Kumar Store','Credit');

-- 3h️⃣ ledger transactions
INSERT INTO transactions (date, entity_id, entity_type, type, ref_no, debit, credit, narration)
VALUES
    ('2082-04-02',1,'customer','Sale','1/',40000.00,0.00,''),
    ('2082-04-21',1,'customer','Sale','2/23',37920.00,0.00,''),
    ('2082-05-11',1,'customer','Rcpt','',0.00,200000.00,''),
    ('2082-06-27',1,'customer','Rcpt','',0.00,3125.00,'ATA NAGYAKO 1 BORA');

-- 4️⃣  Indexes
CREATE INDEX IF NOT EXISTS idx_admins_email            ON admins(email);
CREATE INDEX IF NOT EXISTS idx_contacts_email          ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_products_category       ON products(category);
CREATE INDEX IF NOT EXISTS idx_login_email            ON login(email);
CREATE INDEX IF NOT EXISTS idx_customers_login_id     ON customers(login_id);
CREATE INDEX IF NOT EXISTS idx_sales_customerId       ON sales(customerId);
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_accounts_name          ON accounts(account_name);
