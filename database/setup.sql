-- Disable foreign‑key enforcement during teardown, then re-enable before recreate.
PRAGMA foreign_keys = OFF;

-- 1️⃣  DROP ALL EXISTING TABLES (order matters because of FK)
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS purchase_items;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS receipts;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS journal_entries;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS party_balance;
DROP TABLE IF EXISTS pos_customers;
DROP VIEW IF EXISTS v_customer_full;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS login;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;

-- 2️⃣  CREATE TABLES
-- 2a️⃣ admins (system UI admins)
CREATE TABLE admins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    created_at  TEXT    NOT NULL
);

-- 2aa️⃣ users (parent table for all user-linked rows)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT,
    phone TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2b️⃣ contacts (Contact‑Us entries)
CREATE TABLE contacts (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL,
    phone     TEXT NOT NULL,
    subject   TEXT NOT NULL,
    message   TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    FOREIGN KEY(created_by_user_id) REFERENCES users(id)
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
    status        TEXT DEFAULT 'active',
    created_by_user_id INTEGER,
    FOREIGN KEY(created_by_user_id) REFERENCES users(id)
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
    profile_photo TEXT,
    created_by_user_id INTEGER,
    FOREIGN KEY(created_by_user_id) REFERENCES users(id)
);

-- 2e️⃣ customers (optional 1‑to‑1 link to a login record)
CREATE TABLE customers (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    login_id          INTEGER UNIQUE,
    name              TEXT NOT NULL,
    phone             TEXT NOT NULL,
    email             TEXT,
    address           TEXT,
    type              TEXT DEFAULT 'retail',
    pan_no            TEXT,
    alternativeAddress TEXT,
    alternativePhone   TEXT,
    created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    FOREIGN KEY(login_id) REFERENCES login(id)
    ,FOREIGN KEY(created_by_user_id) REFERENCES users(id)
);
-- add FK for customers.login_id -> login.id
-- (created inline so SQLite enforces it when table created by this script)

-- enforce FK to login
PRAGMA foreign_keys = ON;

-- add foreign key constraint via explicit ALTER (SQLite requires recreate; handled here sequentially)

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
    customerId                 INTEGER,
    paymentMode                TEXT DEFAULT 'Cash',
    customerName               TEXT,
    customerAddress            TEXT,
    customerPan                TEXT,
    customerAlternativeAddress TEXT,
    customerAlternativePhone    TEXT,
    created_at                 TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id                    INTEGER,
    FOREIGN KEY(customerId) REFERENCES customers(id)
    ,FOREIGN KEY(user_id) REFERENCES users(id)
);

-- link sales.customerId to customers.id
-- link customers.login_id to login.id

-- 2g️⃣ purchases (stock‑in)
CREATE TABLE purchases (
    id          TEXT PRIMARY KEY,
    supplier    TEXT NOT NULL,
    items       TEXT NOT NULL,
    total       REAL NOT NULL,
    date        TEXT NOT NULL,
    paymentMode TEXT DEFAULT 'Cash',
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id     INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 2g1️⃣ purchase_items (items for purchases)
CREATE TABLE purchase_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id TEXT    NOT NULL,
    product_id  TEXT,
    name        TEXT,
    qty         REAL    NOT NULL,
    price       REAL    NOT NULL,
    total       REAL    NOT NULL,
    created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
    user_id     INTEGER,
    FOREIGN KEY(purchase_id) REFERENCES purchases(id),
    FOREIGN KEY(product_id)  REFERENCES products(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 2f1️⃣ sale_items (items for sales/invoices)
CREATE TABLE sale_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id    TEXT    NOT NULL,
    product_id TEXT,
    name       TEXT,
    qty        REAL    NOT NULL,
    price      REAL    NOT NULL,
    total      REAL    NOT NULL,
    created_at TEXT    DEFAULT CURRENT_TIMESTAMP,
    user_id    INTEGER,
    FOREIGN KEY(sale_id)    REFERENCES sales(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 2k️⃣ chat_sessions + messages (in-app messages / contact threads)
CREATE TABLE chat_sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    subject      TEXT,
    customer_id  INTEGER,
    created_by   INTEGER,
    status       TEXT DEFAULT 'open',
    created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id      INTEGER,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(created_by) REFERENCES users(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   INTEGER NOT NULL,
    sender_login TEXT,
    message      TEXT NOT NULL,
    metadata     TEXT,
    created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id      INTEGER,
    FOREIGN KEY(session_id) REFERENCES chat_sessions(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 2l️⃣ chat_messages (alternate name used in some DB viewers)
CREATE TABLE chat_messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   INTEGER NOT NULL,
    sender       TEXT,
    body         TEXT NOT NULL,
    meta         TEXT,
    created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id      INTEGER,
    FOREIGN KEY(session_id) REFERENCES chat_sessions(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 2n️⃣ pos_customers (POS-specific customer records)
CREATE TABLE pos_customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_code TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    pan_no TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 2o️⃣ orders + order_items (order management separate from sales)
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    customer_id INTEGER,
    cashier TEXT,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0.00,
    tax REAL DEFAULT 0.00,
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_mode TEXT DEFAULT 'Cash',
    date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id TEXT,
    name TEXT,
    qty REAL NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 2p️⃣ payments & receipts
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    amount REAL NOT NULL,
    method TEXT,
    ref TEXT,
    paid_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER,
    receipt_no TEXT,
    amount REAL NOT NULL,
    issued_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY(payment_id) REFERENCES payments(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 2q️⃣ party_balance (simple ledger per party/customer)
CREATE TABLE party_balance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_type TEXT,
    party_id INTEGER,
    balance REAL DEFAULT 0.00,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 2r️⃣ combined view for customers (v_customer_full)
CREATE VIEW v_customer_full AS
SELECT id AS customer_id, name, phone, email, address, 'customers' AS source FROM customers
UNION ALL
SELECT id AS customer_id, name, phone, email, address, 'pos_customers' AS source FROM pos_customers;

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
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id     INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 2i️⃣ accounts (balance‑sheet / chart of accounts)
CREATE TABLE accounts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name     TEXT NOT NULL,
    account_type     TEXT NOT NULL,
    opening_balance REAL DEFAULT 0.00,
    user_id         INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 2j️⃣ journal_entries (double-entry journal ledger)
CREATE TABLE journal_entries (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    date               TEXT    NOT NULL,
    debit_account_id   INTEGER NOT NULL,
    credit_account_id  INTEGER NOT NULL,
    amount             REAL    NOT NULL,
    narration          TEXT,
    ref_no             TEXT,
    source_type        TEXT,
    source_id          INTEGER,
    created_at         TEXT    DEFAULT CURRENT_TIMESTAMP,
    user_id            INTEGER,
    FOREIGN KEY(debit_account_id)  REFERENCES accounts(id),
    FOREIGN KEY(credit_account_id) REFERENCES accounts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 3️⃣  INSERT SEED DATA
-- 3a️⃣ admins
INSERT INTO admins (email, password, created_at)
VALUES ('admin@dhakaltraders.com',
        '$2a$10$tZ261jNpw8s.d.8W50t9zOT3ZpL.r1jJ22Q4j5fTMy6L93Z/M1Q.S',
        CURRENT_TIMESTAMP);

-- 3b️⃣ login / users (shared password: Tribe@123; roles differ: admin, owner, cashier)
INSERT INTO login (email, display_name, role, phone, password_hash, address, bio, avatar)
VALUES
    ('admin@dhakaltraders.com','System Admin','admin','9857823400','e0939d580de8176875cfa6680369aa72ac96c1efa10bd589a3f16b0eef6e365e','Kathmandu','System Administrator','👨💻'),
    ('owner@dhakaltraders.com','Dipak Sharma','owner','9857823400','e0939d580de8176875cfa6680369aa72ac96c1efa10bd589a3f16b0eef6e365e','Itahari, Nepal','Owner of Dhakal Traders','🧔'),
    ('cashier@dhakaltraders.com','Ram Bahadur','cashier','9847000000','e0939d580de8176875cfa6680369aa72ac96c1efa10bd589a3f16b0eef6e365e','Dharan','Senior Cashier','👤');

-- 3b1️⃣ users (must exist before rows that reference it)
INSERT INTO users (email, name, role, phone)
VALUES
    ('admin@dhakaltraders.com','System Admin','admin','9857823400'),
    ('owner@dhakaltraders.com','Dipak Sharma','owner','9857823400'),
    ('cashier@dhakaltraders.com','Ram Bahadur','cashier','9847000000');

-- 3b2️⃣ customer logins (same login table; customer role)
INSERT INTO login (email, display_name, role, phone, password_hash, address, bio, avatar)
VALUES
    ('shyam@example.com','Shyam Kumar Store','customer','9812345678','9f6871fb0cd7475c4dce552274cb9f5ca6a2192b729e83f8b367bf05b8ce7fad','Biratnagar','Retail Customer','🛍️'),
    ('hari@gmail.com','Hari Prasad','customer','9841000111','83e63c0166f4b309825b7f1f410cbfe770202950271cc8ccd9d8c08dd6a735e3','Kathmandu','Retail Customer','🛍️');

-- 3b3️⃣ seed accounts for ledger mapping (Accounts Receivable, Sales, Cash)
INSERT INTO accounts (account_name, account_type, opening_balance, user_id)
VALUES
    ('Accounts Receivable','asset',0.00,2),
    ('Sales Revenue','income',0.00,2),
    ('Cash','asset',0.00,3);

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
INSERT INTO customers (login_id, name, phone, email, address, type, pan_no, created_by_user_id)
VALUES
    ((SELECT id FROM login WHERE email = 'shyam@example.com' LIMIT 1),'Shyam Kumar Store','9812345678','shyam@example.com','Biratnagar','wholesale','123456789',2),
    ((SELECT id FROM login WHERE email = 'hari@gmail.com' LIMIT 1),'Hari Prasad','9841000111','hari@gmail.com','Kathmandu','retail','',3);

-- 3f️⃣ contacts (single entry)
INSERT INTO contacts (name, email, phone, subject, message, created_by_user_id)
VALUES ('Sita Thapa','sita@test.com','9801122334','timur','I would like to order 50kg of organic timur in bulk.',NULL);

-- 3g️⃣ sales (one invoice)
INSERT INTO sales (id, items, subtotal, discount, tax, total, date, cashier, customerId, customerName, paymentMode, user_id)
VALUES ('INV-50001','[{"id":"PRD-1001","nameEn":"Organic Timur","nameNe":"अर्गानिक टिमुर","price":1200,"qty":2,"total":2400}]',2400,0,0,2400,CURRENT_TIMESTAMP,'Ram Bahadur',1,'Shyam Kumar Store','Credit',3);

-- sample sale_items matching INV-50001
INSERT INTO sale_items (sale_id, product_id, name, qty, price, total, user_id)
VALUES ('INV-50001','PRD-1001','Organic Timur',2,1200,2400,3);

-- sample orders/order_items/payments/receipts
INSERT INTO orders (id, customer_id, cashier, subtotal, discount, tax, total, status, payment_mode, date, user_id)
VALUES ('ORD-1001', 1, 'Ram Bahadur', 2400, 0, 0, 2400, 'completed', 'Credit', CURRENT_TIMESTAMP, 3);

INSERT INTO order_items (order_id, product_id, name, qty, price, total, user_id)
VALUES ('ORD-1001','PRD-1001','Organic Timur',2,1200,2400,3);

INSERT INTO payments (order_id, amount, method, ref, user_id)
VALUES ('ORD-1001',2400,'Credit','PAY-1001',3);

INSERT INTO receipts (payment_id, receipt_no, amount, user_id)
VALUES (1,'RCPT-1001',2400,3);

-- sample pos_customer
INSERT INTO pos_customers (customer_code, name, phone, email, address, pan_no, user_id)
VALUES ('PC-001','Shyam Kumar Store','9812345678','shyam@example.com','Biratnagar','123456789',2);

-- 3h️⃣ ledger transactions
INSERT INTO transactions (date, entity_id, entity_type, type, ref_no, debit, credit, narration, user_id)
VALUES
    ('2082-04-02',1,'customer','Sale','1/',40000.00,0.00,'',3),
    ('2082-04-21',1,'customer','Sale','2/23',37920.00,0.00,'',3),
    ('2082-05-11',1,'customer','Rcpt','',0.00,200000.00,'',2),
    ('2082-06-27',1,'customer','Rcpt','',0.00,3125.00,'ATA NAGYAKO 1 BORA',2);

    -- 3i️⃣ journal_entries (sample double-entry rows)
    INSERT INTO journal_entries (date, debit_account_id, credit_account_id, amount, narration, ref_no, source_type, source_id, user_id)
    VALUES
        (CURRENT_TIMESTAMP, 1, 2, 40000.00, 'Sale to Shyam Kumar Store', 'INV-50001', 'sale', 1, 3),
        (CURRENT_TIMESTAMP, 3, 1, 200000.00, 'Receipt from customer', 'RCPT-0001', 'receipt', 2, 2);

    -- TRIGGERS: create transactions and journal entries automatically
    CREATE TRIGGER trg_orders_after_insert
    AFTER INSERT ON orders
    WHEN NEW.status = 'completed'
    BEGIN
        INSERT INTO transactions (date, entity_id, entity_type, type, ref_no, debit, credit, narration, created_at, user_id)
        VALUES (CURRENT_TIMESTAMP, NULL, 'order', 'Sale', NEW.id, NEW.total, 0.00, 'Order completed: ' || NEW.id, CURRENT_TIMESTAMP, NEW.user_id);

        INSERT INTO journal_entries (date, debit_account_id, credit_account_id, amount, narration, ref_no, source_type, source_id, created_at, user_id)
        VALUES (CURRENT_TIMESTAMP, 1, 2, NEW.total, 'Sale (order ' || NEW.id || ')', NEW.id, 'order', NULL, CURRENT_TIMESTAMP, NEW.user_id);
    END;

    CREATE TRIGGER trg_payments_after_insert
    AFTER INSERT ON payments
    BEGIN
        INSERT INTO transactions (date, entity_id, entity_type, type, ref_no, debit, credit, narration, created_at, user_id)
        VALUES (CURRENT_TIMESTAMP, NULL, 'payment', 'Payment', NEW.ref, 0.00, NEW.amount, 'Payment received for order ' || IFNULL(NEW.order_id,''), CURRENT_TIMESTAMP, NEW.user_id);

        INSERT INTO journal_entries (date, debit_account_id, credit_account_id, amount, narration, ref_no, source_type, source_id, created_at, user_id)
        VALUES (CURRENT_TIMESTAMP, 3, 1, NEW.amount, 'Payment received (order ' || IFNULL(NEW.order_id,'') || ')', NEW.ref, 'payment', NEW.id, CURRENT_TIMESTAMP, NEW.user_id);
    END;

    -- journal_entries: keep party_balance in sync and create reversal transactions on delete
    CREATE TRIGGER trg_journal_after_insert
    AFTER INSERT ON journal_entries
    BEGIN
        INSERT OR IGNORE INTO party_balance (party_type, party_id, balance, updated_at, user_id)
        VALUES (NEW.source_type, NEW.source_id, 0.00, CURRENT_TIMESTAMP, NEW.user_id);

        UPDATE party_balance
        SET balance = balance + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE party_type = NEW.source_type AND party_id = NEW.source_id;
    END;

    CREATE TRIGGER trg_journal_after_update
    AFTER UPDATE ON journal_entries
    BEGIN
        -- subtract old amount from old party
        UPDATE party_balance
        SET balance = balance - OLD.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE party_type = OLD.source_type AND party_id = OLD.source_id;

        -- ensure new party_balance row exists
        INSERT OR IGNORE INTO party_balance (party_type, party_id, balance, updated_at, user_id)
        VALUES (NEW.source_type, NEW.source_id, 0.00, CURRENT_TIMESTAMP, NEW.user_id);

        -- add new amount to new party
        UPDATE party_balance
        SET balance = balance + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE party_type = NEW.source_type AND party_id = NEW.source_id;
    END;

    CREATE TRIGGER trg_journal_after_delete
    AFTER DELETE ON journal_entries
    BEGIN
        -- decrement party balance
        UPDATE party_balance
        SET balance = balance - OLD.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE party_type = OLD.source_type AND party_id = OLD.source_id;

        -- insert a reversal transaction record for audit
        INSERT INTO transactions (date, entity_id, entity_type, type, ref_no, debit, credit, narration, created_at, user_id)
        VALUES (CURRENT_TIMESTAMP, OLD.source_id, OLD.source_type, 'Reversal', OLD.ref_no, 0.00, OLD.amount, 'Reversal of journal ' || OLD.id, CURRENT_TIMESTAMP, OLD.user_id);
    END;

-- 4️⃣  Indexes
CREATE INDEX IF NOT EXISTS idx_admins_email            ON admins(email);
CREATE INDEX IF NOT EXISTS idx_contacts_email          ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_products_category       ON products(category);
CREATE INDEX IF NOT EXISTS idx_login_email            ON login(email);
CREATE INDEX IF NOT EXISTS idx_customers_login_id     ON customers(login_id);
CREATE INDEX IF NOT EXISTS idx_sales_customerId       ON sales(customerId);
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_accounts_name          ON accounts(account_name);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id    ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id   ON messages(session_id);
