-- RetailIQ SQLite Production Schema
-- Designed for Big Data Analytics and Business Intelligence

DROP TABLE IF EXISTS transactions;

CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    order_date TEXT NOT NULL, -- ISO-8601 YYYY-MM-DD
    customer_id TEXT,
    product_id TEXT,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    sales REAL NOT NULL,      -- Net gross line sales
    cost REAL NOT NULL,       -- Cost of goods sold (COGS)
    profit REAL NOT NULL,     -- Net line margin: sales - cost
    region TEXT,
    state TEXT,
    payment_method TEXT,
    discount REAL DEFAULT 0.0
);

-- Performance Optimization Indexes
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_date ON transactions(order_date);
CREATE INDEX idx_transactions_region ON transactions(region);
