-- ====================================================================
-- RetailIQ: 12 Core Analytical SQL Queries for Retail Intelligence
-- ====================================================================

-- 1. Total Revenue, Cost, Profit & Profit Margin
SELECT 
    COUNT(DISTINCT order_id) AS total_orders,
    COUNT(*) AS total_line_items,
    ROUND(SUM(sales), 2) AS total_revenue,
    ROUND(SUM(cost), 2) AS total_cost,
    ROUND(SUM(profit), 2) AS total_profit,
    ROUND((SUM(profit) / CASE WHEN SUM(sales) = 0 THEN 1 ELSE SUM(sales) END) * 100, 2) AS profit_margin_pct
FROM transactions;

-- 2. Monthly Revenue and Profit Growth Trends
SELECT 
    SUBSTR(order_date, 1, 7) AS sales_month,
    COUNT(DISTINCT order_id) AS distinct_orders,
    ROUND(SUM(sales), 2) AS monthly_revenue,
    ROUND(SUM(profit), 2) AS monthly_profit,
    ROUND(SUM(profit) / SUM(sales) * 100, 2) AS monthly_margin_pct,
    ROUND(AVG(sales), 2) AS avg_line_sales
FROM transactions
WHERE order_date IS NOT NULL AND order_date != ''
GROUP BY SUBSTR(order_date, 1, 7)
ORDER BY sales_month ASC;

-- 3. Top 10 Best-Performing Products by Revenue
SELECT 
    product_name,
    category,
    SUM(quantity) AS units_sold,
    ROUND(SUM(sales), 2) AS total_revenue,
    ROUND(SUM(profit), 2) AS total_profit,
    ROUND(SUM(profit) / SUM(sales) * 100, 2) AS profit_margin_pct
FROM transactions
GROUP BY product_id, product_name, category
ORDER BY total_revenue DESC
LIMIT 10;

-- 4. Category Performance and Revenue Share
SELECT 
    category,
    COUNT(DISTINCT order_id) AS order_count,
    SUM(quantity) AS total_units_sold,
    ROUND(SUM(sales), 2) AS category_revenue,
    ROUND(SUM(profit), 2) AS category_profit,
    ROUND((SUM(sales) * 100.0) / (SELECT SUM(sales) FROM transactions), 2) AS revenue_share_pct
FROM transactions
GROUP BY category
ORDER BY category_revenue DESC;

-- 5. Regional Revenue, Profit & Average Order Value (AOV)
SELECT 
    region,
    COUNT(DISTINCT order_id) AS total_orders,
    ROUND(SUM(sales), 2) AS regional_revenue,
    ROUND(SUM(profit), 2) AS regional_profit,
    ROUND(SUM(sales) / COUNT(DISTINCT order_id), 2) AS regional_aov,
    ROUND((SUM(profit) / SUM(sales)) * 100, 2) AS profit_margin_pct
FROM transactions
WHERE region IS NOT NULL AND region != ''
GROUP BY region
ORDER BY regional_revenue DESC;

-- 6. Top 15 Highest-Spending Customers
SELECT 
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
LIMIT 15;

-- 7. Average Order Value (AOV) by Payment Method
SELECT 
    COALESCE(payment_method, 'Standard') AS payment_method,
    COUNT(DISTINCT order_id) AS total_orders,
    ROUND(SUM(sales), 2) AS total_sales,
    ROUND(SUM(sales) / COUNT(DISTINCT order_id), 2) AS average_order_value,
    ROUND(AVG(discount) * 100, 1) AS avg_discount_pct
FROM transactions
GROUP BY payment_method
ORDER BY total_sales DESC;

-- 8. Customer Purchase Frequency Cohorts (CASE WHEN)
WITH CustomerOrderCounts AS (
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
ORDER BY customer_count DESC;

-- 9. Customers with Declining Purchase Activity (At-Risk)
WITH MaxDatasetDate AS (
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
LIMIT 15;

-- 10. Product Profitability Ranking & Negative Margins
SELECT 
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
LIMIT 12;

-- 11. Product Revenue Contribution Percentage (Subquery)
SELECT 
    product_name,
    category,
    ROUND(SUM(sales), 2) AS product_revenue,
    ROUND((SUM(sales) / (SELECT SUM(sales) FROM transactions)) * 100, 2) AS revenue_contribution_pct
FROM transactions
GROUP BY product_id, product_name, category
ORDER BY product_revenue DESC
LIMIT 10;

-- 12. Ranking Products within Category via SQL Window Function
WITH CategorySales AS (
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
ORDER BY category, rank_in_category ASC;
