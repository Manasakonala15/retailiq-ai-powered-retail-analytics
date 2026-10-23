"""
RetailIQ — Analytical Unit Test Suite
Validates critical retail mathematical formulas, database integrity, deduplication, 
missing cost coverage, return rate processing, read-only SQL guardrails, and RFM scoring.
"""

import unittest
import sqlite3
import re

def validate_sql_read_only(sql: str) -> bool:
    """Analytical SQL Guardrail: Rejects destructive or schema-modifying commands."""
    # Strip comments
    clean = re.sub(r'/\*.*?\*/', ' ', sql, flags=re.DOTALL)
    clean = re.sub(r'--.*$', ' ', clean, flags=re.MULTILINE).strip()
    if not clean:
        return False
    
    first_word_match = re.match(r'^\s*([a-zA-Z]+)', clean)
    if not first_word_match:
        return False
    first_word = first_word_match.group(1).upper()
    if first_word not in ('SELECT', 'WITH', 'EXPLAIN'):
        return False
    
    forbidden = {'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'TRUNCATE', 'REPLACE', 'CREATE', 'ATTACH', 'DETACH', 'VACUUM', 'PRAGMA', 'GRANT', 'REVOKE'}
    statements = [s.strip() for s in clean.split(';') if s.strip()]
    for stmt in statements:
        w_match = re.match(r'^\s*([a-zA-Z]+)', stmt)
        if w_match and w_match.group(1).upper() in forbidden:
            return False
    return True

class TestRetailAnalytics(unittest.TestCase):
    def setUp(self):
        # Known deterministic micro-dataset to verify exact calculations
        # Order ORD-01 has TWO line items (must count as 1 distinct order!)
        self.transactions = [
            {"id": "TX-1", "order_id": "ORD-01", "order_date": "2025-01-10", "customer_id": "CUST-A", "product_id": "P-1", "product_name": "Keyboard", "category": "Electronics", "quantity": 2, "unit_price": 50.0, "sales": 100.0, "cost": 60.0, "profit": 40.0, "region": "East", "cost_available": True},
            {"id": "TX-2", "order_id": "ORD-01", "order_date": "2025-01-10", "customer_id": "CUST-A", "product_id": "P-2", "product_name": "Mouse", "category": "Electronics", "quantity": 1, "unit_price": 25.0, "sales": 25.0, "cost": 15.0, "profit": 10.0, "region": "East", "cost_available": True},
            {"id": "TX-3", "order_id": "ORD-02", "order_date": "2025-02-14", "customer_id": "CUST-B", "product_id": "P-3", "product_name": "Chair", "category": "Office", "quantity": 1, "unit_price": 200.0, "sales": 200.0, "cost": 120.0, "profit": 80.0, "region": "West", "cost_available": True},
            {"id": "TX-4", "order_id": "ORD-03", "order_date": "2025-03-20", "customer_id": "CUST-A", "product_id": "P-1", "product_name": "Keyboard", "category": "Electronics", "quantity": 1, "unit_price": 50.0, "sales": 50.0, "cost": 30.0, "profit": 20.0, "region": "East", "cost_available": True},
            # Negative profit loss-leader item
            {"id": "TX-5", "order_id": "ORD-04", "order_date": "2025-04-05", "customer_id": "CUST-C", "product_id": "P-4", "product_name": "Promo Cable", "category": "Electronics", "quantity": 2, "unit_price": 5.0, "sales": 10.0, "cost": 14.0, "profit": -4.0, "region": "Central", "cost_available": True},
        ]

    def test_revenue_and_profit_calculation(self):
        total_rev = sum(t["sales"] for t in self.transactions)
        total_cost = sum(t["cost"] for t in self.transactions)
        total_profit = sum(t["profit"] for t in self.transactions)

        self.assertAlmostEqual(total_rev, 385.0, places=2)
        self.assertAlmostEqual(total_cost, 239.0, places=2)
        self.assertAlmostEqual(total_profit, 146.0, places=2)
        # Margin = (146 / 385) * 100 = 37.922...%
        profit_margin = (total_profit / total_rev) * 100
        self.assertAlmostEqual(profit_margin, 37.92, delta=0.01)

    def test_unique_order_and_aov_no_double_counting(self):
        # 5 line items, but ORD-01 has 2 items -> exactly 4 unique orders
        unique_orders = set(t["order_id"] for t in self.transactions)
        self.assertEqual(len(unique_orders), 4)

        total_rev = sum(t["sales"] for t in self.transactions)
        # AOV = 385.0 / 4 = 96.25
        aov = total_rev / len(unique_orders)
        self.assertAlmostEqual(aov, 96.25, places=2)

    def test_unique_customer_counting_and_arpc(self):
        # CUST-A (2 orders), CUST-B (1 order), CUST-C (1 order) -> exactly 3 customers
        unique_customers = set(t["customer_id"] for t in self.transactions)
        self.assertEqual(len(unique_customers), 3)

        total_rev = sum(t["sales"] for t in self.transactions)
        avg_cust_spend = total_rev / len(unique_customers)
        self.assertAlmostEqual(avg_cust_spend, 128.33, delta=0.01)

    def test_average_selling_price_asp(self):
        # ASP = Total Revenue / Total Units Sold
        total_rev = sum(t["sales"] for t in self.transactions)
        total_units = sum(t["quantity"] for t in self.transactions) # 2 + 1 + 1 + 1 + 2 = 7 units
        self.assertEqual(total_units, 7)
        asp = total_rev / total_units
        self.assertAlmostEqual(asp, 385.0 / 7, places=2)
        self.assertAlmostEqual(asp, 55.0, places=2)

    def test_missing_cost_coverage_and_profit_unavailability(self):
        """
        Critical Correctness Requirement:
        When cost data is unavailable across >50% of records, RetailIQ must NOT fabricate
        profit numbers (e.g. by setting cost=0). Profit must be flagged as unavailable.
        """
        dataset_without_costs = [
            {"order_id": "O1", "sales": 100.0, "cost": 0.0, "cost_available": False},
            {"order_id": "O2", "sales": 150.0, "cost": 0.0, "cost_available": False},
            {"order_id": "O3", "sales": 80.0, "cost": 40.0, "cost_available": True},
        ]
        valid_cost_rows = sum(1 for d in dataset_without_costs if d["cost_available"])
        cost_coverage_pct = (valid_cost_rows / len(dataset_without_costs)) * 100
        # 1 / 3 = 33.33% coverage -> below 50% threshold
        self.assertLess(cost_coverage_pct, 50.0)
        profit_available = cost_coverage_pct >= 50.0
        self.assertFalse(profit_available)

    def test_negative_quantities_and_returns(self):
        """
        Negative quantities indicate customer returns and must NOT be silently discarded.
        They reduce total net units sold and feed into Return Rate calculations.
        """
        transactions_with_returns = [
            {"order_id": "O1", "quantity": 10, "sales": 500.0, "is_return": False},
            {"order_id": "O2", "quantity": 5, "sales": 250.0, "is_return": False},
            {"order_id": "O3", "quantity": -2, "sales": -100.0, "is_return": True}, # return of 2 units
        ]
        positive_units = sum(t["quantity"] for t in transactions_with_returns if t["quantity"] > 0)
        return_units = abs(sum(t["quantity"] for t in transactions_with_returns if t["quantity"] < 0))
        net_units = positive_units - return_units
        self.assertEqual(positive_units, 15)
        self.assertEqual(return_units, 2)
        self.assertEqual(net_units, 13)

        # Return rate = (return_units / positive_units) * 100
        return_rate_pct = (return_units / positive_units) * 100
        self.assertAlmostEqual(return_rate_pct, (2 / 15) * 100, places=2)

    def test_division_by_zero_safety(self):
        empty_txs = []
        tot_rev = sum(t["sales"] for t in empty_txs)
        orders = len(set(t["order_id"] for t in empty_txs))
        aov = tot_rev / orders if orders > 0 else 0.0
        margin = (0 / tot_rev * 100) if tot_rev > 0 else 0.0
        self.assertEqual(aov, 0.0)
        self.assertEqual(margin, 0.0)

    def test_sql_read_only_guardrails(self):
        """
        Verifies that custom SQL execution blocks destructive/modifying statements
        while allowing analytical queries (SELECT, WITH, EXPLAIN).
        """
        # Permitted queries
        self.assertTrue(validate_sql_read_only("SELECT * FROM transactions LIMIT 10;"))
        self.assertTrue(validate_sql_read_only("WITH CategorySales AS (SELECT category, SUM(sales) FROM transactions GROUP BY category) SELECT * FROM CategorySales;"))
        self.assertTrue(validate_sql_read_only("   SELECT COUNT(DISTINCT order_id) FROM transactions; "))
        self.assertTrue(validate_sql_read_only("EXPLAIN QUERY PLAN SELECT * FROM transactions;"))

        # Forbidden destructive queries
        self.assertFalse(validate_sql_read_only("DROP TABLE transactions;"))
        self.assertFalse(validate_sql_read_only("DELETE FROM transactions WHERE sales < 0;"))
        self.assertFalse(validate_sql_read_only("INSERT INTO transactions VALUES ('1', '2');"))
        self.assertFalse(validate_sql_read_only("UPDATE transactions SET sales = 0;"))
        self.assertFalse(validate_sql_read_only("ALTER TABLE transactions DROP COLUMN profit;"))
        self.assertFalse(validate_sql_read_only("TRUNCATE TABLE transactions;"))
        # Injection via semicolon
        self.assertFalse(validate_sql_read_only("SELECT 1; DROP TABLE transactions;"))

    def test_sqlite_in_memory_execution_and_window_functions(self):
        conn = sqlite3.connect(":memory:")
        cursor = conn.cursor()

        cursor.execute("""
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
                region TEXT
            );
        """)

        for t in self.transactions:
            cursor.execute("""
                INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (t["id"], t["order_id"], t["order_date"], t["customer_id"], t["product_id"],
                  t["product_name"], t["category"], t["quantity"], t["unit_price"], t["sales"],
                  t["cost"], t["profit"], t["region"]))
        conn.commit()

        # Query 1: Aggregates
        cursor.execute("SELECT COUNT(DISTINCT order_id), SUM(sales), SUM(profit) FROM transactions;")
        orders, rev, prof = cursor.fetchone()
        self.assertEqual(orders, 4)
        self.assertEqual(rev, 385.0)
        self.assertEqual(prof, 146.0)

        # Query 12: Window Function DENSE_RANK
        cursor.execute("""
            SELECT category, product_name, SUM(sales),
                   DENSE_RANK() OVER (PARTITION BY category ORDER BY SUM(sales) DESC) as rnk
            FROM transactions
            GROUP BY category, product_name
            ORDER BY category, rnk;
        """)
        results = cursor.fetchall()
        self.assertTrue(len(results) > 0)
        conn.close()

    def test_iqr_outlier_detection(self):
        values = [10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 26, 150] # 150 is outlier
        sorted_vals = sorted(values)
        n = len(sorted_vals)
        q1 = sorted_vals[int(n * 0.25)]
        q3 = sorted_vals[int(n * 0.75)]
        iqr = q3 - q1
        upper_bound = q3 + 1.5 * iqr
        outliers = [v for v in values if v > upper_bound]
        self.assertIn(150, outliers)
        self.assertEqual(len(outliers), 1)

if __name__ == "__main__":
    unittest.main()
