/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import initSqlJs, { Database } from 'sql.js';
import { Transaction } from '../types/retail';

export interface SQLQueryResult {
  columns: string[];
  values: (string | number | null | Uint8Array)[][];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

export interface SQLPredefinedQuery {
  id: number;
  title: string;
  category: 'Aggregations' | 'Time Series' | 'Customer Analytics' | 'Window Functions' | 'Profitability';
  description: string;
  sql: string;
}

export const PREDEFINED_QUERIES: SQLPredefinedQuery[] = [
  {
    id: 1,
    title: '1. Total Revenue, Cost, Profit & Profit Margin',
    category: 'Aggregations',
    description: 'Calculates high-level enterprise financial aggregates with safe division to avoid division-by-zero errors.',
    sql: `SELECT 
    COUNT(DISTINCT order_id) AS total_orders,
    COUNT(*) AS total_line_items,
    ROUND(SUM(sales), 2) AS total_revenue,
    ROUND(SUM(cost), 2) AS total_cost,
    ROUND(SUM(profit), 2) AS total_profit,
    ROUND((SUM(profit) / CASE WHEN SUM(sales) = 0 THEN 1 ELSE SUM(sales) END) * 100, 2) AS profit_margin_pct
FROM transactions;`,
  },
  {
    id: 2,
    title: '2. Monthly Revenue and Profit Growth Trends',
    category: 'Time Series',
    description: 'Groups transactions by month (YYYY-MM), aggregating revenue, profit, distinct orders, and average transaction size.',
    sql: `SELECT 
    SUBSTR(order_date, 1, 7) AS sales_month,
    COUNT(DISTINCT order_id) AS distinct_orders,
    ROUND(SUM(sales), 2) AS monthly_revenue,
    ROUND(SUM(profit), 2) AS monthly_profit,
    ROUND(SUM(profit) / SUM(sales) * 100, 2) AS monthly_margin_pct,
    ROUND(AVG(sales), 2) AS avg_line_sales
FROM transactions
WHERE order_date IS NOT NULL AND order_date != ''
GROUP BY SUBSTR(order_date, 1, 7)
ORDER BY sales_month ASC;`,
  },
  {
    id: 3,
    title: '3. Top 10 Best-Performing Products by Revenue',
    category: 'Aggregations',
    description: 'Ranks products by total sales generated along with total units sold and net gross profit.',
    sql: `SELECT 
    product_name,
    category,
    SUM(quantity) AS units_sold,
    ROUND(SUM(sales), 2) AS total_revenue,
    ROUND(SUM(profit), 2) AS total_profit,
    ROUND(SUM(profit) / SUM(sales) * 100, 2) AS profit_margin_pct
FROM transactions
GROUP BY product_id, product_name, category
ORDER BY total_revenue DESC
LIMIT 10;`,
  },
  {
    id: 4,
    title: '4. Category Performance and Revenue Share',
    category: 'Aggregations',
    description: 'Computes department-level revenue, profit, order counts, and relative revenue contribution.',
    sql: `SELECT 
    category,
    COUNT(DISTINCT order_id) AS order_count,
    SUM(quantity) AS total_units_sold,
    ROUND(SUM(sales), 2) AS category_revenue,
    ROUND(SUM(profit), 2) AS category_profit,
    ROUND((SUM(sales) * 100.0) / (SELECT SUM(sales) FROM transactions), 2) AS revenue_share_pct
FROM transactions
GROUP BY category
ORDER BY category_revenue DESC;`,
  },
  {
    id: 5,
    title: '5. Regional Revenue, Profit & Average Order Value',
    category: 'Aggregations',
    description: 'Summarizes geographic market performance, evaluating regional revenue and order efficiency.',
    sql: `SELECT 
    region,
    COUNT(DISTINCT order_id) AS total_orders,
    ROUND(SUM(sales), 2) AS regional_revenue,
    ROUND(SUM(profit), 2) AS regional_profit,
    ROUND(SUM(sales) / COUNT(DISTINCT order_id), 2) AS regional_aov,
    ROUND((SUM(profit) / SUM(sales)) * 100, 2) AS profit_margin_pct
FROM transactions
WHERE region IS NOT NULL AND region != ''
GROUP BY region
ORDER BY regional_revenue DESC;`,
  },
  {
    id: 6,
    title: '6. Top 15 Highest-Spending Customers',
    category: 'Customer Analytics',
    description: 'Identifies enterprise VIP accounts based on cumulative lifetime sales volume and order frequency.',
    sql: `SELECT 
    customer_id,
    COUNT(DISTINCT order_id) AS distinct_orders,
    ROUND(SUM(sales), 2) AS total_spend,
    ROUND(AVG(sales), 2) AS avg_item_spend,
    MIN(order_date) AS first_order_date,
    MAX(order_date) AS latest_order_date
FROM transactions
WHERE customer_id IS NOT NULL AND customer_id != ''
GROUP BY customer_id
ORDER BY total_spend DESC
LIMIT 15;`,
  },
  {
    id: 7,
    title: '7. Average Order Value (AOV) by Payment Method',
    category: 'Customer Analytics',
    description: 'Analyzes how payment channels impact average ticket size and total processing volume.',
    sql: `SELECT 
    COALESCE(payment_method, 'Standard') AS payment_method,
    COUNT(DISTINCT order_id) AS total_orders,
    ROUND(SUM(sales), 2) AS total_sales,
    ROUND(SUM(sales) / COUNT(DISTINCT order_id), 2) AS average_order_value,
    ROUND(AVG(discount) * 100, 1) AS avg_discount_pct
FROM transactions
GROUP BY payment_method
ORDER BY total_sales DESC;`,
  },
  {
    id: 8,
    title: '8. Customer Purchase Frequency Cohorts',
    category: 'Customer Analytics',
    description: 'Segments customer base into distinct transaction frequency buckets using CASE WHEN logic.',
    sql: `WITH CustomerOrderCounts AS (
    SELECT 
        customer_id,
        COUNT(DISTINCT order_id) AS order_count,
        SUM(sales) AS total_spend
    FROM transactions
    WHERE customer_id IS NOT NULL AND customer_id != ''
    GROUP BY customer_id
)
SELECT 
    CASE 
        WHEN order_count = 1 THEN '1 Order (One-Time)'
        WHEN order_count BETWEEN 2 AND 3 THEN '2-3 Orders (Occasional)'
        WHEN order_count BETWEEN 4 AND 6 THEN '4-6 Orders (Regular)'
        ELSE '7+ Orders (Frequent / VIP)'
    END AS frequency_cohort,
    COUNT(*) AS customer_count,
    ROUND(SUM(total_spend), 2) AS cohort_revenue,
    ROUND(AVG(total_spend), 2) AS avg_spend_per_customer
FROM CustomerOrderCounts
GROUP BY frequency_cohort
ORDER BY customer_count DESC;`,
  },
  {
    id: 9,
    title: '9. Customers with Declining Purchase Activity (At-Risk)',
    category: 'Customer Analytics',
    description: 'Finds customers who made purchases in the first half of the year but have been inactive in the latest 90 days.',
    sql: `WITH MaxDatasetDate AS (
    SELECT MAX(order_date) AS max_date FROM transactions
),
CustomerActivity AS (
    SELECT 
        customer_id,
        COUNT(DISTINCT order_id) AS total_orders,
        ROUND(SUM(sales), 2) AS total_spend,
        MAX(order_date) AS latest_purchase_date,
        JULIANDAY((SELECT max_date FROM MaxDatasetDate)) - JULIANDAY(MAX(order_date)) AS days_since_last_purchase
    FROM transactions
    WHERE customer_id IS NOT NULL AND customer_id != ''
    GROUP BY customer_id
)
SELECT 
    customer_id,
    total_orders,
    total_spend,
    latest_purchase_date,
    ROUND(days_since_last_purchase, 0) AS days_inactive,
    CASE 
        WHEN days_since_last_purchase > 120 THEN 'Severe Inactivity Risk'
        WHEN days_since_last_purchase BETWEEN 75 AND 120 THEN 'Moderate Risk'
        ELSE 'Active'
    END AS risk_tier
FROM CustomerActivity
WHERE days_since_last_purchase > 60
ORDER BY total_spend DESC
LIMIT 15;`,
  },
  {
    id: 10,
    title: '10. Product Profitability Ranking & Negative Margins',
    category: 'Profitability',
    description: 'Flags loss-leader items and items with negative gross margins requiring pricing review.',
    sql: `SELECT 
    product_name,
    category,
    SUM(quantity) AS units_sold,
    ROUND(SUM(sales), 2) AS total_sales,
    ROUND(SUM(cost), 2) AS total_cost,
    ROUND(SUM(profit), 2) AS net_profit,
    ROUND((SUM(profit) / SUM(sales)) * 100, 2) AS profit_margin_pct,
    CASE 
        WHEN SUM(profit) < 0 THEN 'ALERT: Loss Leader / Negative Margin'
        WHEN (SUM(profit) / SUM(sales)) < 0.15 THEN 'Low Margin (<15%)'
        WHEN (SUM(profit) / SUM(sales)) > 0.40 THEN 'High Margin (>40%)'
        ELSE 'Healthy Margin'
    END AS margin_health_status
FROM transactions
GROUP BY product_id, product_name, category
ORDER BY net_profit ASC
LIMIT 12;`,
  },
  {
    id: 11,
    title: '11. Product Revenue Contribution Percentage (Subquery)',
    category: 'Window Functions',
    description: 'Calculates the exact revenue percentage contribution of each product against total enterprise turnover.',
    sql: `SELECT 
    product_name,
    category,
    ROUND(SUM(sales), 2) AS product_revenue,
    ROUND((SUM(sales) / (SELECT SUM(sales) FROM transactions)) * 100, 2) AS revenue_contribution_pct
FROM transactions
GROUP BY product_id, product_name, category
ORDER BY product_revenue DESC
LIMIT 10;`,
  },
  {
    id: 12,
    title: '12. Ranking Products within Category via SQL Window Function',
    category: 'Window Functions',
    description: 'Uses ANSI SQL DENSE_RANK() OVER (PARTITION BY category ORDER BY total_sales DESC) to rank items within their department.',
    sql: `WITH CategorySales AS (
    SELECT 
        category,
        product_name,
        ROUND(SUM(sales), 2) AS category_item_sales,
        SUM(quantity) AS units_sold
    FROM transactions
    GROUP BY category, product_id, product_name
)
SELECT 
    category,
    product_name,
    category_item_sales,
    units_sold,
    DENSE_RANK() OVER (PARTITION BY category ORDER BY category_item_sales DESC) as rank_in_category
FROM CategorySales
ORDER BY category, rank_in_category ASC;`,
  },
];

let sqlEngine: Database | null = null;
let currentTransactionCount = 0;

/**
 * Initializes sql.js in WebAssembly and builds the in-memory SQLite schema
 */
export async function initializeDatabase(transactions: Transaction[]): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  const db = new SQL.Database();

  // Create tables with indexes
  db.run(`
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      order_date TEXT,
      customer_id TEXT,
      product_id TEXT,
      product_name TEXT,
      category TEXT,
      quantity REAL,
      unit_price REAL,
      sales REAL,
      cost REAL,
      profit REAL,
      region TEXT,
      state TEXT,
      payment_method TEXT,
      discount REAL
    );

    CREATE INDEX idx_transactions_order ON transactions(order_id);
    CREATE INDEX idx_transactions_customer ON transactions(customer_id);
    CREATE INDEX idx_transactions_category ON transactions(category);
    CREATE INDEX idx_transactions_date ON transactions(order_date);
  `);

  // Batch insert transactions using prepared statement
  const insertStmt = db.prepare(`
    INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.run('BEGIN TRANSACTION;');
  for (const t of transactions) {
    insertStmt.run([
      t.id,
      t.orderId,
      t.orderDate,
      t.customerId,
      t.productId,
      t.productName,
      t.category,
      t.quantity,
      t.unitPrice,
      t.sales,
      t.cost,
      t.profit,
      t.region,
      t.state || null,
      t.paymentMethod || null,
      t.discount || 0,
    ]);
  }
  db.run('COMMIT;');
  insertStmt.free();

  sqlEngine = db;
  currentTransactionCount = transactions.length;
  return db;
}

/**
 * Executes an arbitrary SQL query on the active SQLite database
 */
export async function executeSQLQuery(sql: string, transactions?: Transaction[]): Promise<SQLQueryResult> {
  const startTime = performance.now();

  try {
    if (!sqlEngine || (transactions && transactions.length !== currentTransactionCount)) {
      if (transactions) {
        await initializeDatabase(transactions);
      } else {
        throw new Error('Database not initialized and no transactions provided.');
      }
    }

    const res = sqlEngine!.exec(sql);
    const executionTimeMs = Math.round((performance.now() - startTime) * 10) / 10;

    if (!res || res.length === 0) {
      return {
        columns: [],
        values: [],
        rowCount: 0,
        executionTimeMs,
      };
    }

    const { columns, values } = res[0];
    return {
      columns,
      values,
      rowCount: values.length,
      executionTimeMs,
    };
  } catch (error: any) {
    const executionTimeMs = Math.round((performance.now() - startTime) * 10) / 10;
    return {
      columns: [],
      values: [],
      rowCount: 0,
      executionTimeMs,
      error: error.message || 'SQL execution error',
    };
  }
}
