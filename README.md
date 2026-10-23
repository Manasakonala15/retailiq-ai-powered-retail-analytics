# RetailIQ — AI-Powered Retail Analytics and Decision Intelligence Platform

RetailIQ is an enterprise-grade retail business intelligence and decision support platform designed for Big Data Analytics. It solves real-world commerce problems by transforming raw transaction logs into executive intelligence through automated data hygiene audits, customer RFM segmentation, native SQLite query execution, statistical EDA, Holt's linear time-series forecasting, and server-side Gemini decision support.

---

## 1. Project Overview & Business Problem

Retail businesses often face disparate transaction logs plagued by duplicate entries, negative quantities (returns), and extreme outliers. Business owners struggle to address core strategic questions:
- What factors drive net profitability versus top-line revenue?
- Which high-margin categories should receive additional working capital?
- Which loyal customer cohorts contribute the vast majority of cash flow?
- Which previously active accounts show declining recency and are at risk of churning?
- Are specific products operating as negative-margin loss leaders?

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
                       │  (IQR, Dups, Returns)   │
                       └────────────┬────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────┐
│ Executive KPIs &      │ │ Customer RFM      │ │ SQLite Engine (Wasm)  │
│ Multi-Dim Filters     │ │ Quintile Scoring  │ │ 12 Analytical Queries │
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
1. **Executive Overview**: Total Revenue, Profit, Orders, Units, AOV, Gross Margin, and monthly timeline progression.
2. **Sales Analytics**: Revenue and profit trends, category margin analysis, payment method ticket sizes, and top 10 products.
3. **Customer Intelligence**: Recency, Frequency, Monetary (RFM) quintile segmentation, spending histograms, and VIP account rosters.
4. **Product Performance**: Catalog profitability, wholesale cost structures, and negative-margin alerts.
5. **Regional Analytics**: Geographic revenue share, regional AOV, and territory product mix.
6. **Exploratory Data Analysis (EDA)**: Descriptive statistics, box plots with 1.5x IQR outlier fences, and bivariate Pearson correlation matrix.
7. **Data Quality & Validation**: Non-destructive cleaning pipeline with preview and reversible reload.
8. **AI Business Insights & Forecasting**: Gemini 3.8 Flash grounded in verified statistics with an integrated Holt's linear trend forecasting model.
9. **Data Management & SQL Studio**: Interactive SQLite query runner with 12 predefined queries, custom query editor, and CSV upload.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Database**: SQLite running in WebAssembly (`sql.js`) for in-browser SQL execution (supporting CTEs, JOINs, and Window Functions)
- **Backend / API**: Express 4 server with Vite development middleware
- **AI Intelligence**: Google Gemini 3.8 Flash via `@google/genai` TypeScript SDK (server-side only) with rule-based analytical fallback
- **Analytical Python Suite**: Python 3.10, Pandas, NumPy, Matplotlib, Seaborn, SQLite3, Unittest

---

## 4. Mathematical KPI Formulas

All metrics are calculated strictly from the active dataset and avoid multi-line order double-counting:

$$\text{Total Revenue} = \sum (\text{Quantity} \times \text{Unit Price} \times (1 - \text{Discount}))$$

$$\text{Total Profit} = \sum (\text{Line Sales} - \text{Cost of Goods Sold})$$

$$\text{Total Orders} = \text{Count}(\text{DISTINCT Order ID})$$

$$\text{Average Order Value (AOV)} = \frac{\text{Total Revenue}}{\text{Total Orders}}$$

$$\text{Gross Profit Margin (\%)} = \left(\frac{\text{Total Profit}}{\text{Total Revenue}}\right) \times 100$$

$$\text{Average Customer Spending} = \frac{\text{Total Revenue}}{\text{Count}(\text{DISTINCT Customer ID})}$$

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

## 6. Installation & Execution

### Prerequisites
- Node.js >= 18.0.0
- Python 3.10+ (for optional Python backend scripts & tests)

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
Ran 6 tests in 0.005s
OK
```

---

## 7. Data Quality & Privacy Governance
- **No Hallucinated Data**: AI decision intelligence receives only aggregated, verified mathematical totals.
- **No Secret Leakage**: `GEMINI_API_KEY` is accessed strictly in `server.ts` and never exposed to the client.
- **Non-Destructive Cleaning**: Uploaded raw datasets are stored immutably. Cleaned views can be reverted at any time with a single click.
