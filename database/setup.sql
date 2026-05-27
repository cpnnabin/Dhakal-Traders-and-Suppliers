    PRAGMA foreign_keys = ON;

    -- =========================================================
    -- COMPANY INFORMATION
    -- =========================================================
    CREATE TABLE company (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        branch_name TEXT,
        vat_no TEXT,
        pan_no TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        logo TEXT,
        invoice_footer TEXT,
        return_policy TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =========================================================
    -- LOGIN / STAFF
    -- =========================================================
    CREATE TABLE login (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        phone TEXT NOT NULL,
        alternative_phone TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN (
            'owner',
            'admin',
            'manager',
            'cashier',
            'accountant',
            'supplier',
            'customer'
        )),
        pan_no TEXT,
        address TEXT,
        photo TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =========================================================
    -- CATEGORY
    -- =========================================================
    CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT UNIQUE NOT NULL,
        description TEXT
    );

    -- =========================================================
    -- BRANDS
    -- =========================================================
    CREATE TABLE brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand_name TEXT UNIQUE NOT NULL
    );

    -- =========================================================
    -- UNITS
    -- =========================================================
    CREATE TABLE units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_name TEXT UNIQUE NOT NULL,
        short_name TEXT UNIQUE NOT NULL
    );

    -- =========================================================
    -- WAREHOUSES
    -- =========================================================
    CREATE TABLE warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        warehouse_name TEXT NOT NULL,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =========================================================
    -- PRODUCTS
    -- =========================================================
    CREATE TABLE products (
        id TEXT PRIMARY KEY,
        barcode TEXT UNIQUE,
        name_en TEXT NOT NULL,
        name_ne TEXT,
        category_id INTEGER,
        brand_id INTEGER,
        unit_id INTEGER,
        purchase_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        tax_percent REAL DEFAULT 13,
        min_stock REAL DEFAULT 0,
        image TEXT,
        expiry_date DATE,
        status TEXT DEFAULT 'active',
        login_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(category_id) REFERENCES categories(id),
        FOREIGN KEY(brand_id) REFERENCES brands(id),
        FOREIGN KEY(unit_id) REFERENCES units(id),
        FOREIGN KEY(login_id) REFERENCES login(id)
    );

    -- =========================================================
    -- PRODUCT STOCK
    -- =========================================================
    CREATE TABLE product_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        warehouse_id INTEGER NOT NULL,
        product_id TEXT NOT NULL,
        quantity REAL DEFAULT 0,
        FOREIGN KEY(warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- =========================================================
    -- CUSTOMERS
    -- =========================================================
    CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_code TEXT UNIQUE,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        pan_no TEXT,
        loyalty_points REAL DEFAULT 0,
        opening_balance REAL DEFAULT 0,
        login_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(login_id) REFERENCES login(id)
    );

    -- =========================================================
    -- SUPPLIERS
    -- =========================================================
    CREATE TABLE suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_code TEXT UNIQUE,
        supplier_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        pan_no TEXT,
        opening_balance REAL DEFAULT 0,
        login_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(login_id) REFERENCES login(id)
    );

    -- =========================================================
    -- SALES
    -- =========================================================
    CREATE TABLE sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no TEXT UNIQUE NOT NULL,
        customer_id INTEGER,
        login_id INTEGER,
        warehouse_id INTEGER,
        bill_date DATE NOT NULL,
        miti TEXT,
        payment_mode TEXT DEFAULT 'Cash',
        gross_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        taxable_amount REAL DEFAULT 0,
        vat_amount REAL DEFAULT 0,
        net_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        due_amount REAL DEFAULT 0,
        tender_amount REAL DEFAULT 0,
        change_amount REAL DEFAULT 0,
        total_qty REAL DEFAULT 0,
        loyalty_point_earned REAL DEFAULT 0,
        loyalty_total_points REAL DEFAULT 0,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id),
        FOREIGN KEY(login_id) REFERENCES login(id),
        FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
    );

    -- =========================================================
    -- SALE ITEMS
    -- =========================================================
    CREATE TABLE sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        hs_code TEXT,
        qty REAL NOT NULL,
        rate REAL NOT NULL,
        discount REAL DEFAULT 0,
        vat_percent REAL DEFAULT 13,
        vat_amount REAL DEFAULT 0,
        amount REAL NOT NULL,
        batch_no TEXT,
        expiry_date DATE,
        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY(product_id) REFERENCES products(id)
    );

    -- =========================================================
    -- PURCHASES
    -- =========================================================
    CREATE TABLE purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_no TEXT UNIQUE NOT NULL,
        supplier_id INTEGER,
        login_id INTEGER,
        warehouse_id INTEGER,
        purchase_date DATE NOT NULL,
        payment_mode TEXT DEFAULT 'Cash',
        gross_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        taxable_amount REAL DEFAULT 0,
        vat_amount REAL DEFAULT 0,
        net_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        due_amount REAL DEFAULT 0,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY(login_id) REFERENCES login(id),
        FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
    );

    -- =========================================================
    -- PURCHASE ITEMS
    -- =========================================================
    CREATE TABLE purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        qty REAL NOT NULL,
        rate REAL NOT NULL,
        discount REAL DEFAULT 0,
        vat_percent REAL DEFAULT 13,
        vat_amount REAL DEFAULT 0,
        amount REAL NOT NULL,
        batch_no TEXT,
        expiry_date DATE,
        FOREIGN KEY(purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
        FOREIGN KEY(product_id) REFERENCES products(id)
    );

    -- =========================================================
    -- SALES RETURNS
    -- =========================================================
    CREATE TABLE sales_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER,
        customer_id INTEGER,
        total_amount REAL DEFAULT 0,
        reason TEXT,
        return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sale_id) REFERENCES sales(id),
        FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    -- =========================================================
    -- PURCHASE RETURNS
    -- =========================================================
    CREATE TABLE purchase_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER,
        supplier_id INTEGER,
        total_amount REAL DEFAULT 0,
        reason TEXT,
        return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(purchase_id) REFERENCES purchases(id),
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    );

    -- =========================================================
    -- CHART OF ACCOUNTS
    -- =========================================================
    CREATE TABLE accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_code TEXT UNIQUE NOT NULL,
        account_name TEXT NOT NULL,
        account_type TEXT NOT NULL CHECK(account_type IN (
            'Asset',
            'Liability',
            'Equity',
            'Income',
            'Expense'
        )),
        parent_account_id INTEGER,
        opening_balance REAL DEFAULT 0,
        current_balance REAL DEFAULT 0,
        FOREIGN KEY(parent_account_id) REFERENCES accounts(id)
    );

    -- =========================================================
    -- JOURNAL VOUCHERS
    -- =========================================================
    CREATE TABLE journal_vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_no TEXT UNIQUE NOT NULL,
        voucher_date DATE NOT NULL,
        narration TEXT,
        reference_no TEXT,
        login_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(login_id) REFERENCES login(id)
    );

    -- =========================================================
    -- JOURNAL ENTRIES
    -- =========================================================
    CREATE TABLE journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        description TEXT,
        FOREIGN KEY(voucher_id) REFERENCES journal_vouchers(id) ON DELETE CASCADE,
        FOREIGN KEY(account_id) REFERENCES accounts(id)
    );

    -- =========================================================
    -- CUSTOMER LEDGER
    -- =========================================================
    CREATE TABLE customer_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        sale_id INTEGER,
        transaction_type TEXT,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        remarks TEXT,
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id),
        FOREIGN KEY(sale_id) REFERENCES sales(id)
    );

    -- =========================================================
    -- SUPPLIER LEDGER
    -- =========================================================
    CREATE TABLE supplier_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        purchase_id INTEGER,
        transaction_type TEXT,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        remarks TEXT,
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY(purchase_id) REFERENCES purchases(id)
    );

    -- =========================================================
    -- CASH BOOK
    -- =========================================================
    CREATE TABLE cash_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        reference_no TEXT,
        description TEXT,
        cash_in REAL DEFAULT 0,
        cash_out REAL DEFAULT 0,
        balance REAL DEFAULT 0
    );

    -- =========================================================
    -- BANK ACCOUNTS
    -- =========================================================
    CREATE TABLE bank_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bank_name TEXT NOT NULL,
        account_name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        branch TEXT,
        opening_balance REAL DEFAULT 0,
        current_balance REAL DEFAULT 0
    );

    -- =========================================================
    -- BANK TRANSACTIONS
    -- =========================================================
    CREATE TABLE bank_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bank_account_id INTEGER NOT NULL,
        transaction_type TEXT,
        reference_no TEXT,
        deposit REAL DEFAULT 0,
        withdrawal REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        remarks TEXT,
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(bank_account_id) REFERENCES bank_accounts(id)
    );

    -- =========================================================
    -- EXPENSE CATEGORIES
    -- =========================================================
    CREATE TABLE expense_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT UNIQUE NOT NULL
    );

    -- =========================================================
    -- EXPENSES
    -- =========================================================
    CREATE TABLE expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        amount REAL NOT NULL,
        payment_method TEXT,
        description TEXT,
        expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        login_id INTEGER,
        FOREIGN KEY(category_id) REFERENCES expense_categories(id),
        FOREIGN KEY(login_id) REFERENCES login(id)
    );

    -- =========================================================
    -- INCOME
    -- =========================================================
    CREATE TABLE incomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        income_date DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =========================================================
    -- PAYMENTS
    -- =========================================================
    CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER,
        payment_method TEXT NOT NULL,
        paid_amount REAL NOT NULL,
        tender_amount REAL DEFAULT 0,
        return_amount REAL DEFAULT 0,
        transaction_no TEXT,
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    -- =========================================================
    -- STOCK MOVEMENTS
    -- =========================================================
    CREATE TABLE stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        movement_type TEXT CHECK(movement_type IN (
            'purchase',
            'sale',
            'sales_return',
            'purchase_return',
            'adjustment'
        )),
        reference_id INTEGER,
        qty_in REAL DEFAULT 0,
        qty_out REAL DEFAULT 0,
        balance_qty REAL DEFAULT 0,
        movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES products(id)
    );

    -- =========================================================
    -- ATTENDANCE
    -- =========================================================
    CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login_id INTEGER NOT NULL,
        check_in DATETIME,
        check_out DATETIME,
        status TEXT DEFAULT 'present',
        FOREIGN KEY(login_id) REFERENCES login(id)
    );

    -- =========================================================
    -- NOTIFICATIONS
    -- =========================================================
    CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        login_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(login_id) REFERENCES login(id)
    );

    -- =========================================================
    -- CHAT SESSIONS
    -- =========================================================
    CREATE TABLE chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    -- =========================================================
    -- CHAT MESSAGES
    -- =========================================================
    CREATE TABLE chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        login_id INTEGER,
        message TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY(login_id) REFERENCES login(id)
    );

    -- =========================================================
    -- VAT SALES REGISTER
    -- =========================================================
    CREATE TABLE vat_sales_register (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER,
        bill_no TEXT,
        customer_name TEXT,
        customer_pan TEXT,
        taxable_amount REAL DEFAULT 0,
        vat_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        sales_date DATE,
        FOREIGN KEY(sale_id) REFERENCES sales(id)
    );

    -- =========================================================
    -- VAT PURCHASE REGISTER
    -- =========================================================
    CREATE TABLE vat_purchase_register (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER,
        bill_no TEXT,
        supplier_name TEXT,
        supplier_pan TEXT,
        taxable_amount REAL DEFAULT 0,
        vat_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        purchase_date DATE,
        FOREIGN KEY(purchase_id) REFERENCES purchases(id)
    );

    -- =========================================================
    -- SEED DATA
    -- =========================================================
    INSERT INTO company (
        company_name, branch_name, vat_no, pan_no, address, phone, email, website,
        logo, invoice_footer, return_policy
    )
    VALUES (
        'Dhakal Traders',
        'Main Branch',
        'VAT-123456',
        'PAN-123456789',
        'Itahari, Sunsari, Nepal',
        '9857823400',
        'info@dhakaltraders.com',
        'https://dhakaltraders.com',
        'logo.png',
        'Thank you for shopping with Dhakal Traders.',
        'Goods sold once are only returned with invoice and within 7 days.'
    );

    INSERT INTO login (full_name, username, email, phone, alternative_phone, password_hash, role, pan_no, address, photo, status)
    VALUES
        ('Dipak Sharma', 'dipak', 'dipak@dhakaltraders.com', '9857823400', '9800000001', '$2a$10$w.IOMjySHrdIcnEVUYtyGOMR0QJgvg5eWAPSx4G8QyK6nI7AbK7DW', 'owner', '123456789', 'Itahari', '👨‍💼', 'active'),
        ('System Admin', 'admin', 'admin@dhakaltraders.com', '9800000002', NULL, '$2a$10$w.IOMjySHrdIcnEVUYtyGOMR0QJgvg5eWAPSx4G8QyK6nI7AbK7DW', 'admin', '123456780', 'Itahari', '🧑‍💻', 'active'),
        ('Ram Bahadur', 'cashier', 'cashier@dhakaltraders.com', '9847000000', NULL, '$2a$10$w.IOMjySHrdIcnEVUYtyGOMR0QJgvg5eWAPSx4G8QyK6nI7AbK7DW', 'cashier', '123456782', 'Dharan', '👤', 'active'),
        ('Sita Adhikari', 'accountant', 'accountant@dhakaltraders.com', '9800000004', NULL, '$2a$10$w.IOMjySHrdIcnEVUYtyGOMR0QJgvg5eWAPSx4G8QyK6nI7AbK7DW', 'accountant', '123456783', 'Biratnagar', '🧾', 'active'),
        ('Nabin Karki', 'nabin', 'nabin@dhakaltraders.com', '9851000003', '9800000005', '$2a$10$w.IOMjySHrdIcnEVUYtyGOMR0QJgvg5eWAPSx4G8QyK6nI7AbK7DW', 'manager', '123456784', 'Itahari', '🧑‍🏫', 'active'),
        ('Milan Rai', 'milan', 'milan@dhakaltraders.com', '9849000005', NULL, '$2a$10$w.IOMjySHrdIcnEVUYtyGOMR0QJgvg5eWAPSx4G8QyK6nI7AbK7DW', 'cashier', '123456785', 'Dharan', '👨‍🔧', 'active');

    INSERT INTO categories (category_name, description)
    VALUES
        ('Grocery', 'Daily grocery items'),
        ('Herbs', 'Local herbs and spices'),
        ('Daily', 'Household daily use products');

    INSERT INTO brands (brand_name)
    VALUES ('Dhakal Brand'), ('Nepal Fresh'), ('Organic Valley');

    INSERT INTO units (unit_name, short_name)
    VALUES ('Kilogram', 'kg'), ('Liter', 'ltr'), ('Piece', 'pcs');

    INSERT INTO warehouses (warehouse_name, address)
    VALUES ('Main Warehouse', 'Itahari'), ('Retail Store', 'Itahari Bazar');

    INSERT INTO expense_categories (category_name)
    VALUES ('Rent'), ('Salary'), ('Utilities'), ('Transport');

    INSERT INTO bank_accounts (bank_name, account_name, account_number, branch, opening_balance, current_balance)
    VALUES ('Nepal Bank', 'Dhakal Traders Main', '010123456789', 'Itahari', 50000, 72500);

    INSERT INTO accounts (account_code, account_name, account_type, parent_account_id, opening_balance, current_balance)
    VALUES
        ('1000', 'Cash', 'Asset', NULL, 50000, 72500),
        ('1100', 'Bank', 'Asset', NULL, 50000, 72500),
        ('2000', 'Accounts Payable', 'Liability', NULL, 0, 0),
        ('3000', 'Sales Revenue', 'Income', NULL, 0, 0),
        ('4000', 'Purchases', 'Expense', NULL, 0, 0);

    INSERT INTO products (
        id, barcode, name_en, name_ne, category_id, brand_id, unit_id,
        purchase_price, selling_price, tax_percent, min_stock, image, expiry_date, status, login_id
    )
    VALUES
        ('PRD-1001', '9850001001', 'Organic Timur', 'अर्गानिक टिमुर', 2, 1, 1, 800, 1200, 13, 5, 'timur.png', NULL, 'active', 1),
        ('PRD-1002', '9850001002', 'Raw Honey', 'काँचो मह', 3, 3, 2, 600, 950, 13, 10, 'honey.png', NULL, 'active', 1),
        ('PRD-1003', '9850001003', 'Rice', 'चामल', 1, 2, 1, 1800, 2100, 13, 20, 'rice.png', NULL, 'active', 1);

    INSERT INTO product_stock (warehouse_id, product_id, quantity)
    VALUES
        (1, 'PRD-1001', 78),
        (1, 'PRD-1002', 30),
        (2, 'PRD-1003', 100),
        (2, 'PRD-1001', 18),
        (2, 'PRD-1002', 22),
        (1, 'PRD-1003', 55);

    INSERT INTO customers (customer_code, full_name, phone, email, address, pan_no, loyalty_points, opening_balance, login_id)
    VALUES
        ('CUST-001', 'Shyam Kumar Store', '9812345678', 'shyam@example.com', 'Biratnagar', '123456789', 15, 2500, 3),
        ('CUST-002', 'Hari Prasad', '9841000111', 'hari@gmail.com', 'Kathmandu', NULL, 8, 0, 3);

    INSERT INTO suppliers (supplier_code, supplier_name, phone, email, address, pan_no, opening_balance, login_id)
    VALUES
        ('SUP-001', 'Hari Suppliers', '9811111111', 'supplier@dhakaltraders.com', 'Biratnagar', '123456784', 15000, 4),
        ('SUP-002', 'Nepal Fresh Supply', '9802222222', 'fresh@dhakaltraders.com', 'Dharan', '123456786', 20000, 4);

    INSERT INTO sales (
        invoice_no, customer_id, login_id, warehouse_id, bill_date, miti, payment_mode,
        gross_amount, discount_amount, taxable_amount, vat_amount, net_amount, paid_amount,
        due_amount, tender_amount, change_amount, total_qty, loyalty_point_earned,
        loyalty_total_points, note
    )
    VALUES
        (
        'INV-0001', 1, 4, 1, '2026-05-26', '2083-02-12', 'Cash',
        3000, 100, 2566.37, 333.63, 2900, 3000,
        0, 3000, 100, 3, 3,
        18, 'First sample sale'
        ),
        (
        'INV-0002', 2, 5, 2, '2026-05-26', '2083-02-12', 'Cash',
        4050, 200, 3363.72, 436.28, 3800, 4000,
        0, 4000, 200, 3, 4,
        12, 'Second sample sale'
        );

    INSERT INTO sale_items (
        sale_id, product_id, product_name, hs_code, qty, rate, discount, vat_percent,
        vat_amount, amount, batch_no, expiry_date
    )
    VALUES
        (1, 'PRD-1001', 'Organic Timur', '0909', 1, 1200, 0, 13, 156, 1200, 'B-001', NULL),
        (1, 'PRD-1002', 'Raw Honey', '0409', 2, 950, 100, 13, 177.63, 1700, 'B-002', NULL),
        (2, 'PRD-1001', 'Organic Timur', '0909', 1, 1200, 0, 13, 156, 1200, 'B-003', NULL),
        (2, 'PRD-1002', 'Raw Honey', '0409', 1, 950, 50, 13, 117, 900, 'B-004', NULL),
        (2, 'PRD-1003', 'Rice', '1006', 1, 2100, 150, 13, 253.5, 1950, 'B-005', NULL);

    INSERT INTO purchases (
        bill_no, supplier_id, login_id, warehouse_id, purchase_date, payment_mode,
        gross_amount, discount_amount, taxable_amount, vat_amount, net_amount, paid_amount,
        due_amount, note
    )
    VALUES
        (
        'PUR-0001', 1, 4, 1, '2026-05-25', 'Bank',
        5000, 0, 4424.78, 575.22, 5000, 5000,
        0, 'Initial stock purchase'
        ),
        (
        'PUR-0002', 2, 6, 2, '2026-05-26', 'Bank',
        6200, 200, 5300, 690, 6000, 6000,
        0, 'Second stock purchase'
        );

    INSERT INTO purchase_items (
        purchase_id, product_id, product_name, qty, rate, discount, vat_percent,
        vat_amount, amount, batch_no, expiry_date
    )
    VALUES
        (1, 'PRD-1001', 'Organic Timur', 2, 800, 0, 13, 208, 1600, 'PB-001', NULL),
        (1, 'PRD-1003', 'Rice', 2, 1700, 0, 13, 367.22, 3400, 'PB-002', NULL),
        (2, 'PRD-1001', 'Organic Timur', 2, 800, 0, 13, 208, 1600, 'PB-003', NULL),
        (2, 'PRD-1002', 'Raw Honey', 3, 600, 0, 13, 234, 1800, 'PB-004', NULL),
        (2, 'PRD-1003', 'Rice', 1, 2800, 200, 13, 364, 2800, 'PB-005', NULL);

    INSERT INTO sales_returns (sale_id, customer_id, total_amount, reason)
    VALUES (1, 1, 200, 'Damaged item returned');

    INSERT INTO purchase_returns (purchase_id, supplier_id, total_amount, reason)
    VALUES (1, 1, 100, 'Short supply');

    INSERT INTO journal_vouchers (voucher_no, voucher_date, narration, reference_no, login_id)
    VALUES
        ('JV-0001', '2026-05-26', 'Opening entry', 'REF-001', 2),
        ('JV-0002', '2026-05-26', 'Second cash sale entry', 'INV-0002', 5),
        ('JV-0003', '2026-05-26', 'Second purchase entry', 'PUR-0002', 6);

    INSERT INTO journal_entries (voucher_id, account_id, debit, credit, description)
    VALUES
        (1, 1, 50000, 0, 'Opening cash balance'),
        (1, 4, 0, 50000, 'Opening capital'),
        (2, 1, 4050, 0, 'Cash from INV-0002'),
        (2, 4, 0, 4050, 'Sales revenue from INV-0002'),
        (3, 5, 6200, 0, 'Stock purchase for PUR-0002'),
        (3, 2, 0, 6200, 'Bank payment for PUR-0002');

    INSERT INTO customer_ledger (customer_id, sale_id, transaction_type, debit, credit, balance, remarks)
    VALUES
        (1, 1, 'Sale', 2900, 0, 2900, 'Invoice INV-0001'),
        (2, 2, 'Sale', 3800, 0, 3800, 'Invoice INV-0002');

    INSERT INTO supplier_ledger (supplier_id, purchase_id, transaction_type, debit, credit, balance, remarks)
    VALUES
        (1, 1, 'Purchase', 5000, 0, 5000, 'Bill PUR-0001'),
        (2, 2, 'Purchase', 6000, 0, 6000, 'Bill PUR-0002');

    INSERT INTO cash_book (reference_no, description, cash_in, cash_out, balance)
    VALUES
        ('INV-0001', 'Cash sale received', 3000, 0, 53000),
        ('INV-0002', 'Cash sale received', 4050, 0, 57050);

    INSERT INTO bank_transactions (bank_account_id, transaction_type, reference_no, deposit, withdrawal, balance, remarks)
    VALUES
        (1, 'Deposit', 'DEP-0001', 5000, 0, 77500, 'Deposit from sales'),
        (1, 'Withdrawal', 'PAY-0002', 0, 6200, 71300, 'Bank payment for PUR-0002');

    INSERT INTO expenses (category_id, amount, payment_method, description, login_id)
    VALUES (1, 12000, 'Cash', 'Shop rent for the month', 4);

    INSERT INTO incomes (source, amount, description)
    VALUES ('Service income', 1500, 'Delivery charge income');

    INSERT INTO payments (sale_id, payment_method, paid_amount, tender_amount, return_amount, transaction_no)
    VALUES (1, 'Cash', 3000, 3000, 100, 'TRX-0001');

    INSERT INTO stock_movements (product_id, movement_type, reference_id, qty_in, qty_out, balance_qty)
    VALUES
        ('PRD-1001', 'purchase', 1, 2, 0, 52),
        ('PRD-1001', 'sale', 1, 0, 1, 51),
        ('PRD-1002', 'purchase', 1, 2, 0, 32),
        ('PRD-1002', 'sale', 1, 0, 2, 30),
        ('PRD-1001', 'purchase', 2, 2, 0, 54),
        ('PRD-1002', 'purchase', 2, 3, 0, 35),
        ('PRD-1003', 'purchase', 2, 1, 0, 1),
        ('PRD-1001', 'sale', 2, 0, 1, 53),
        ('PRD-1002', 'sale', 2, 0, 1, 34),
        ('PRD-1003', 'sale', 2, 0, 1, 0);

    INSERT INTO attendance (login_id, check_in, check_out, status)
    VALUES
        (4, '2026-05-26 09:00:00', '2026-05-26 18:00:00', 'present'),
        (3, '2026-05-26 09:15:00', '2026-05-26 17:30:00', 'present');

    INSERT INTO notifications (title, message, login_id, is_read)
    VALUES
        ('Welcome', 'Seed data loaded successfully.', 2, 0),
        ('Low stock', 'Raw Honey is reaching minimum stock.', 4, 0);

    INSERT INTO chat_sessions (customer_id, status)
    VALUES (1, 'open');

    INSERT INTO chat_messages (session_id, login_id, message)
    VALUES
        (1, 3, 'Hello, I need a receipt copy.'),
        (1, 4, 'Sure, I will share it shortly.');

    INSERT INTO vat_sales_register (
        sale_id, bill_no, customer_name, customer_pan, taxable_amount, vat_amount, total_amount, sales_date
    )
    VALUES
        (1, 'INV-0001', 'Shyam Kumar Store', '123456789', 2566.37, 333.63, 2900, '2026-05-26'),
        (2, 'INV-0002', 'Hari Prasad', NULL, 3363.72, 436.28, 3800, '2026-05-26');

    INSERT INTO vat_purchase_register (
        purchase_id, bill_no, supplier_name, supplier_pan, taxable_amount, vat_amount, total_amount, purchase_date
    )
    VALUES
        (1, 'PUR-0001', 'Hari Suppliers', '123456784', 4424.78, 575.22, 5000, '2026-05-25'),
        (2, 'PUR-0002', 'Nepal Fresh Supply', '123456786', 5300, 690, 6000, '2026-05-26');

    -- =========================================================
    -- INDEXES
    -- =========================================================
    CREATE INDEX idx_products_category ON products(category_id);
    CREATE INDEX idx_sales_customer ON sales(customer_id);
    CREATE INDEX idx_sales_date ON sales(bill_date);
    CREATE INDEX idx_purchase_supplier ON purchases(supplier_id);
    CREATE INDEX idx_customer_ledger ON customer_ledger(customer_id);
    CREATE INDEX idx_supplier_ledger ON supplier_ledger(supplier_id);
    CREATE INDEX idx_stock_movements ON stock_movements(product_id);
    CREATE INDEX idx_chat_messages ON chat_messages(session_id);
