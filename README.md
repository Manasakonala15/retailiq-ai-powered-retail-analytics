# RetailIQ — AI-Powered Retail Analytics and Decision Intelligence Platform

RetailIQ is an enterprise-grade retail business intelligence and decision support platform designed for Big Data Analytics. It solves real-world commerce problems by transforming raw transaction logs into executive intelligence through automated data hygiene audits, customer RFM segmentation, native SQLite query execution, statistical EDA, Holt's linear time-series forecasting, and server-side Gemini decision support.

---

## 1. Project Overview & Business Problem

Retail businesses often face disparate transaction logs plagued by duplicate entries, negative quantities (returns), and extreme outliers. Business owners struggle to address core strategic questions:
- **Profitability vs. Volume**: What factors drive net operating profit versus top-line sales volume?
- **Working Capital**: Which high-margin categories should receive additional inventory investment?
- **Customer Lifetime Value**: Which loyal customer cohorts contribute the vast majority of cash flow?
- **Churn Risk**: Which previously active accounts show declining recency (>60 days) and require targeted re-engagement?
- **Catalog Health**: Are specific products operating as negative-margin loss leaders?
- **Multi-Line Order Integrity**: How can orders with multiple line items be analyzed without artificially inflating order counts or deflating Average Order Value (AOV)?

RetailIQ addresses these challenges through a unified data engineering and decision intelligence platform.

---

## 2. Core Modules & Architecture

```
                       ┌─────────────────────────┐
                       │   Retail Transaction    │
                       │     CSV Ingestion       │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Auto-Column Detection  │
                       │  & Manual Schema Mapper │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Data Quality Audit     │
                       │  (IQR, Dups, Returns,   │
                       │   Missing-Cost Coverage)│
                       └────────────┬────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────┐
│ Executive KPIs &      │ │ Customer RFM      │ │ SQLite Engine (Wasm)  │
│ Multi-Dim Filters     │ │ Quintile Scoring  │ │ 12 Analytical Queries │
│ (Cost-Safe Guard)     │ │ & Inactivity Risk │ │ (Read-Only Guardrail) │
└───────────┬───────────┘ └─────────┬─────────┘ └───────────┬───────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Verified Statistics    │
                       │  Grounding Aggregation  │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Server-Side Gemini     │
                       │  Decision Intelligence  │
                       │  (Rule Engine Fallback) │
                       └─────────────────────────┘
```

The application spans 9 core navigation modules:
1. **Executive Overview**: Total Revenue, Net Profit, Profit Margin %, Total Distinct Orders, Average Order Value (AOV), Units Sold, Unique Customers, Average Revenue per Customer (ARPC), Average Selling Price (ASP), Return Rate %, and monthly timeline progression.
2. **Sales Analytics**: Revenue and profit trends, category margin analysis, payment method ticket sizes, and top 10 products.
3. **Customer Intelligence**: Recency, Frequency, Monetary (RFM) quintile segmentation, spending histograms, and VIP account rosters.
4. **Product Performance**: Catalog profitability, wholesale cost structures, and negative-margin alerts.
5. **Regional Analytics**: Geographic revenue share, regional AOV, and territory product mix.
6. **Exploratory Data Analysis (EDA)**: Descriptive statistics, box plots with 1.5x IQR outlier fences, and bivariate Pearson correlation matrix.
7. **Data Quality & Validation**: Non-destructive cleaning pipeline with preview, missing-cost coverage audit, return detection, and downloadable Markdown validation report.
8. **AI Business Insights & Forecasting**: Gemini 3.8 Flash grounded in verified statistics with an integrated Holt's linear trend forecasting model and baseline MAE evaluation.
9. **Data Management & SQL Studio**: Interactive SQLite query runner with 12 predefined queries, custom query editor with read-only guardrails, schema DDL viewer, and CSV upload.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Database**: SQLite running in WebAssembly (`sql.js/dist/sql-wasm-inline.js`) for hermetic, in-browser SQL execution (supporting CTEs, JOINs, and Window Functions)
- **Backend / API**: Express 4 server with Vite development middleware (`tsx server.ts`)
- **AI Intelligence**: Google Gemini 3.8 Flash via `@google/genai` TypeScript SDK (server-side proxy route `/api/gemini/insights`) with a deterministic rule-based analytical fallback
- **Analytical Python Suite**: Python 3.10, SQLite3, Unittest
- **Data Science Notebook**: Jupyter Notebook (`notebooks/retail_eda.ipynb`) with reproducible data processing pipeline

---

## 4. Mathematical KPI Formulas

All metrics are calculated strictly from the active dataset and avoid multi-line order double-counting:

$$\text{Total Revenue} = \sum (\text{Quantity} \times \text{Unit Price} \times (1 - \text{Discount}))$$

$$\text{Total Profit} = \sum (\text{Line Sales} - \text{Cost of Goods Sold})$$

$$\text{Total Orders} = \text{Count}(\text{DISTINCT Order ID})$$

$$\text{Average Order Value (AOV)} = \frac{\text{Total Revenue}}{\text{Total Orders}}$$

$$\text{Gross Profit Margin (\%)} = \left(\frac{\text{Total Profit}}{\text{Total Revenue}}\right) \times 100$$

$$\text{Average Revenue Per Customer (ARPC)} = \frac{\text{Total Revenue}}{\text{Count}(\text{DISTINCT Customer ID})}$$

$$\text{Average Selling Price (ASP)} = \frac{\text{Net Revenue}}{\text{Net Units Sold}}$$

$$\text{Customer Return Rate (\%)} = \left(\frac{\text{Return Units}}{\text{Sold Units} + \text{Return Units}}\right) \times 100$$

### Missing Cost Integrity Rule
If cost data is missing across $>50\%$ of dataset rows, RetailIQ **never synthesizes a false cost of 0** (which would falsely report 100% profit margin). Instead:
- Net Profit and Profit Margin are explicitly marked as **"Unavailable"**.
- A prominent advisory banner is rendered guiding the user to map their COGS field in Data Management.

---

## 5. RFM Segmentation Methodology

Customer records are analyzed across three dimensions against the dataset reference date:
- **Recency ($R$)**: Days elapsed between the customer's latest order and the dataset reference date. Scored in quintiles 1–5 (lower days = higher score).
- **Frequency ($F$)**: Count of distinct order IDs placed by the customer. Scored in quintiles 1–5.
- **Monetary ($M$)**: Total valid cumulative revenue generated by the customer. Scored in quintiles 1–5.

### Segment Assignment Rules
- **High-Value Customers**: $R \ge 4, F \ge 4, M \ge 4$
- **Loyal Customers**: $F \ge 4, R \ge 3$
- **Potential Loyalists**: $R \ge 4$ and ($F \ge 2$ or $M \ge 3$)
- **Recent Customers**: $R \ge 4, F \le 2$
- **Needing Attention**: $R = 3, F \ge 2$
- **Inactive / At-Risk**: $R \le 2$ (>90 days inactive)

*Note on Analytical Limitations*: Infrequent purchases in durable goods categories do not inherently indicate customer dissatisfaction or permanent churn.

---

## 6. SQL Analytics Studio & Security Guardrails

RetailIQ provides 12 pre-tested retail SQL queries demonstrating ANSI SQL capabilities:
1. High-level aggregates with safe division (`CASE WHEN SUM(sales) = 0 THEN 1 ELSE ... END`).
2. Monthly revenue and profit growth trends.
3. Top 10 best-performing products by revenue.
4. Category performance and revenue share via subqueries.
5. Regional revenue, profit, and regional AOV.
6. Top 15 highest-spending customer accounts.
7. Payment method distribution and average ticket size.
8. Customer purchase frequency cohorts using `CASE WHEN`.
9. At-risk customer inactivity analysis via Julian day date arithmetic.
10. Product profitability ranking & loss-leader identification.
11. Product revenue contribution percentages.
12. Category product rankings using SQL Window Functions (`DENSE_RANK() OVER (PARTITION BY category ORDER BY sales DESC)`).

### Strict Read-Only Guardrails
Custom query execution strictly validates that queries begin with `SELECT`, `WITH`, or `EXPLAIN`. Any attempt to execute `DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `TRUNCATE`, or `ATTACH` commands (including multi-statement injection via semicolons) is blocked by the security parser with a clear advisory error.

---

## 7. Installation & Execution

### Prerequisites
- Node.js >= 18.0.0
- Python 3.10+ (for analytical unit test suite and Jupyter notebook)

### Running the Full-Stack Application
```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional Gemini key for AI insights)
cp .env.example .env
# Set GEMINI_API_KEY="your_api_key" in .env

# 3. Start development server (serves on http://localhost:3000)
npm run dev
```

### Running the Python Analytics Test Suite
```bash
python3 backend/tests/test_analytics.py
```
Output:
```
..........
----------------------------------------------------------------------
Ran 10 tests in 0.004s

OK
```

### Running the Jupyter EDA Notebook
```bash
jupyter notebook notebooks/retail_eda.ipynb
```

---

## 8. Data Quality & Privacy Governance
- **No Hallucinated Data**: AI decision intelligence receives only aggregated, verified mathematical totals.
- **No Secret Leakage**: `GEMINI_API_KEY` is accessed strictly in `server.ts` and never exposed to the client.
- **Hermetic WASM Loading**: SQLite runs using inline WebAssembly, eliminating external CDN dependencies and browser CSP blocks.
- **Non-Destructive Cleaning**: Uploaded raw datasets are stored immutably. Cleaned views can be reverted at any time with a single click.
