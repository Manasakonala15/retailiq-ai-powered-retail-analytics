/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CanonicalField,
  CleaningOptions,
  ColumnMapping,
  DataQualityAudit,
  DataQualityIssue,
  ExecutiveKPIs,
  GlobalFilters,
  Transaction,
} from '../types/retail';

export const CANONICAL_FIELDS: { key: CanonicalField; label: string; required: boolean; description: string }[] = [
  { key: 'orderId', label: 'Order ID', required: true, description: 'Unique order identifier' },
  { key: 'orderDate', label: 'Order Date', required: true, description: 'Transaction date (YYYY-MM-DD)' },
  { key: 'customerId', label: 'Customer ID', required: false, description: 'Unique customer identifier' },
  { key: 'productId', label: 'Product ID', required: false, description: 'Unique product identifier' },
  { key: 'productName', label: 'Product Name', required: true, description: 'Name or description of product' },
  { key: 'category', label: 'Category', required: true, description: 'Product classification or category' },
  { key: 'quantity', label: 'Quantity', required: true, description: 'Number of units purchased' },
  { key: 'unitPrice', label: 'Unit Price', required: false, description: 'Retail price per unit' },
  { key: 'sales', label: 'Sales / Revenue', required: true, description: 'Total line-item sales amount' },
  { key: 'cost', label: 'Cost', required: false, description: 'Total cost of goods sold' },
  { key: 'profit', label: 'Profit', required: false, description: 'Net gross profit on transaction' },
  { key: 'region', label: 'Region', required: false, description: 'Geographic market/sales region' },
  { key: 'state', label: 'State', required: false, description: 'Geographic state/province' },
  { key: 'paymentMethod', label: 'Payment Method', required: false, description: 'Tender type used' },
  { key: 'discount', label: 'Discount', required: false, description: 'Discount percentage or amount' },
];

/**
 * Automatically maps raw CSV header columns to canonical fields based on common synonyms
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: Record<string, string> = {};
  const lowerMap = new Map(headers.map((h) => [h.toLowerCase().trim().replace(/[\s_\-#.]/g, ''), h]));

  const patterns: Record<CanonicalField, string[]> = {
    orderId: ['orderid', 'orderno', 'ordernumber', 'invoiceid', 'invoiceno', 'transactionid'],
    orderDate: ['orderdate', 'date', 'transactiondate', 'invoicedate', 'createdat', 'purchasedate'],
    customerId: ['customerid', 'customerno', 'clientid', 'userid', 'accountid'],
    productId: ['productid', 'itemid', 'sku', 'productsku', 'itemcode', 'code'],
    productName: ['productname', 'itemname', 'product', 'description', 'title', 'item'],
    category: ['category', 'productcategory', 'department', 'group', 'family'],
    quantity: ['quantity', 'qty', 'units', 'count', 'amountsold', 'itemcount'],
    unitPrice: ['unitprice', 'price', 'rate', 'itemprice', 'retailprice'],
    sales: ['sales', 'revenue', 'totalsales', 'linetotal', 'amount', 'totalamount', 'grosssales'],
    cost: ['cost', 'totalcost', 'cogs', 'unitcost', 'expense', 'wholesale'],
    profit: ['profit', 'netprofit', 'margin', 'grossmargin', 'netincome'],
    region: ['region', 'territory', 'market', 'zone', 'area'],
    state: ['state', 'province', 'statename'],
    paymentMethod: ['paymentmethod', 'payment', 'tendertype', 'paymethod', 'type'],
    discount: ['discount', 'discountrate', 'markdown', 'promo'],
  };

  for (const [canonical, syns] of Object.entries(patterns) as [CanonicalField, string[]][]) {
    for (const syn of syns) {
      if (lowerMap.has(syn)) {
        mapping[canonical] = lowerMap.get(syn)!;
        break;
      }
    }
  }

  return mapping as ColumnMapping;
}

export function parseRawRecords(rows: Record<string, any>[], mapping: ColumnMapping): Transaction[] {
  return rows.map((row, idx) => {
    // Trim whitespace and clean string fields
    const rawOrderId = row[mapping.orderId] !== undefined && String(row[mapping.orderId]).trim() !== ''
      ? String(row[mapping.orderId]).trim()
      : `ORD-UNKNOWN-${idx + 1}`;

    const rawDate = row[mapping.orderDate] !== undefined && String(row[mapping.orderDate]).trim() !== ''
      ? String(row[mapping.orderDate]).trim()
      : '';

    const rawCust = row[mapping.customerId] !== undefined && String(row[mapping.customerId]).trim() !== ''
      ? String(row[mapping.customerId]).trim()
      : `CUST-GUEST-${idx + 1}`;

    const rawProdId = row[mapping.productId] !== undefined && String(row[mapping.productId]).trim() !== ''
      ? String(row[mapping.productId]).trim()
      : `PROD-UNKNOWN-${idx + 1}`;

    const rawProdName = row[mapping.productName] !== undefined && String(row[mapping.productName]).trim() !== ''
      ? String(row[mapping.productName]).trim()
      : 'Uncategorized Item';

    const rawCategory = row[mapping.category] !== undefined && String(row[mapping.category]).trim() !== ''
      ? String(row[mapping.category]).trim()
      : 'General';

    // Numeric conversions
    const rawQtyStr = String(row[mapping.quantity] ?? '1').replace(/[$, ]/g, '').trim();
    const rawQty = parseFloat(rawQtyStr);
    const quantity = isNaN(rawQty) ? 1 : rawQty;
    const isReturn = quantity < 0;

    const rawPriceStr = String(row[mapping.unitPrice] ?? '').replace(/[$, ]/g, '').trim();
    const rawPrice = parseFloat(rawPriceStr);
    let unitPrice = isNaN(rawPrice) ? 0 : rawPrice;

    // Discount percentage (e.g. "15%" or "0.15")
    const rawDiscStr = String(row[mapping.discount] ?? '0').replace(/[$, ]/g, '').trim();
    let discount = 0;
    if (rawDiscStr.includes('%')) {
      discount = parseFloat(rawDiscStr.replace('%', '')) / 100;
    } else {
      const parsedDisc = parseFloat(rawDiscStr);
      discount = !isNaN(parsedDisc) ? (parsedDisc > 1 ? parsedDisc / 100 : parsedDisc) : 0;
    }
    discount = Math.max(0, Math.min(1, isNaN(discount) ? 0 : discount));

    const rawSalesStr = String(row[mapping.sales] ?? '').replace(/[$, ]/g, '').trim();
    const rawSales = parseFloat(rawSalesStr);
    let sales = isNaN(rawSales) ? 0 : rawSales;

    // Derive sales if missing from unit price and quantity
    if (sales === 0 && unitPrice > 0 && quantity !== 0) {
      sales = Math.round(quantity * unitPrice * (1 - discount) * 100) / 100;
    }
    // Derive unit price if missing from sales and quantity
    if (unitPrice === 0 && sales !== 0 && quantity !== 0) {
      unitPrice = Math.round(Math.abs(sales / quantity) * 100) / 100;
    }

    // Cost inspection: check if cost column actually exists in row
    const costColKey = mapping.cost;
    const rawCostVal = costColKey ? row[costColKey] : undefined;
    const hasValidCostField = rawCostVal !== undefined && String(rawCostVal).trim() !== '';
    const rawCost = hasValidCostField ? parseFloat(String(rawCostVal).replace(/[$, ]/g, '')) : NaN;
    
    let cost = 0;
    let costAvailable = false;
    let profit = 0;

    if (!isNaN(rawCost)) {
      cost = rawCost;
      costAvailable = true;
      profit = Math.round((sales - cost) * 100) / 100;
    } else {
      // Check if explicit profit was mapped
      const profitColKey = mapping.profit;
      const rawProfitVal = profitColKey ? row[profitColKey] : undefined;
      const rawProf = rawProfitVal !== undefined && String(rawProfitVal).trim() !== ''
        ? parseFloat(String(rawProfitVal).replace(/[$, ]/g, ''))
        : NaN;

      if (!isNaN(rawProf)) {
        profit = rawProf;
        cost = Math.round((sales - profit) * 100) / 100;
        costAvailable = true;
      } else {
        // No cost provided — DO NOT synthesize cost as zero!
        cost = 0;
        profit = 0;
        costAvailable = false;
      }
    }

    const region = row[mapping.region] !== undefined && String(row[mapping.region]).trim() !== ''
      ? String(row[mapping.region]).trim()
      : 'Standard';

    const state = row[mapping.state] !== undefined && String(row[mapping.state]).trim() !== ''
      ? String(row[mapping.state]).trim()
      : undefined;

    const paymentMethod = row[mapping.paymentMethod] !== undefined && String(row[mapping.paymentMethod]).trim() !== ''
      ? String(row[mapping.paymentMethod]).trim()
      : undefined;

    return {
      id: `TX-${idx + 1}`,
      orderId: rawOrderId,
      orderDate: rawDate,
      customerId: rawCust,
      productId: rawProdId,
      productName: rawProdName,
      category: rawCategory,
      quantity,
      unitPrice,
      sales,
      cost,
      profit,
      costAvailable,
      isReturn,
      region,
      state,
      paymentMethod,
      discount,
    };
  });
}

/**
 * Calculates IQR (Interquartile Range) and boundaries for outlier detection
 */
export function calculateIQRStats(values: number[]): { q1: number; q3: number; iqr: number; lowerBound: number; upperBound: number } {
  if (values.length === 0) {
    return { q1: 0, q3: 0, iqr: 0, lowerBound: 0, upperBound: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
  const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  return { q1, q3, iqr, lowerBound, upperBound };
}

/**
 * Audits data quality across the transaction dataset
 */
export function auditDataQuality(transactions: Transaction[], rawHeaders: string[] = []): DataQualityAudit {
  const totalRows = transactions.length;
  const missingValuesByCol: Record<string, number> = {
    orderId: 0,
    orderDate: 0,
    customerId: 0,
    productName: 0,
    category: 0,
    quantity: 0,
    sales: 0,
    region: 0,
  };

  const issues: DataQualityIssue[] = [];
  const seenOrderProduct = new Set<string>();
  const duplicateIndices: number[] = [];
  const invalidDateIndices: number[] = [];
  const negativeQtyIndices: number[] = [];
  const anomalousFinancialIndices: number[] = [];

  const salesValues: number[] = [];
  const qtyValues: number[] = [];

  transactions.forEach((tx, idx) => {
    // Missing check
    if (!tx.orderId || tx.orderId.includes('UNKNOWN')) missingValuesByCol.orderId++;
    if (!tx.orderDate || isNaN(Date.parse(tx.orderDate))) {
      missingValuesByCol.orderDate++;
      invalidDateIndices.push(idx);
    }
    if (!tx.customerId || tx.customerId.includes('GUEST')) missingValuesByCol.customerId++;
    if (!tx.productName || tx.productName === 'Uncategorized Item') missingValuesByCol.productName++;
    if (!tx.category || tx.category === 'General') missingValuesByCol.category++;
    if (tx.quantity === 0) missingValuesByCol.quantity++;
    if (tx.sales === 0) missingValuesByCol.sales++;
    if (!tx.region || tx.region === 'Standard') missingValuesByCol.region++;

    // Duplicates check
    const compositeKey = `${tx.orderId}|${tx.productId}|${tx.customerId}|${tx.sales}`;
    if (seenOrderProduct.has(compositeKey)) {
      duplicateIndices.push(idx);
    } else {
      seenOrderProduct.add(compositeKey);
    }

    // Negative quantities
    if (tx.quantity < 0) {
      negativeQtyIndices.push(idx);
    } else {
      qtyValues.push(tx.quantity);
    }

    // Anomalous financials (e.g. Sales > $10,000 on single line or unit price <= 0)
    if (tx.sales < 0 || (tx.cost < 0 && tx.sales > 0)) {
      anomalousFinancialIndices.push(idx);
    }

    if (tx.sales > 0) {
      salesValues.push(tx.sales);
    }
  });

  // IQR Outliers
  const salesIQR = calculateIQRStats(salesValues);
  const qtyIQR = calculateIQRStats(qtyValues);

  const salesOutlierIndices: number[] = [];
  const qtyOutlierIndices: number[] = [];

  transactions.forEach((tx, idx) => {
    if (tx.sales > salesIQR.upperBound || tx.sales < salesIQR.lowerBound) {
      salesOutlierIndices.push(idx);
    }
    if (tx.quantity > qtyIQR.upperBound || tx.quantity < qtyIQR.lowerBound) {
      qtyOutlierIndices.push(idx);
    }
  });

  // Construct Data Quality Issues
  if (duplicateIndices.length > 0) {
    issues.push({
      id: 'issue-duplicates',
      severity: 'warning',
      type: 'duplicate_row',
      field: 'Order ID + Product',
      message: `${duplicateIndices.length} duplicate transaction line-items detected.`,
      affectedRowCount: duplicateIndices.length,
      affectedRowIndices: duplicateIndices,
      suggestedFix: 'Deduplicate identical order lines to avoid double-counting revenue.',
    });
  }

  if (invalidDateIndices.length > 0) {
    issues.push({
      id: 'issue-invalid-dates',
      severity: 'error',
      type: 'invalid_date',
      field: 'Order Date',
      message: `${invalidDateIndices.length} records have missing or unparseable timestamps.`,
      affectedRowCount: invalidDateIndices.length,
      affectedRowIndices: invalidDateIndices,
      suggestedFix: 'Impute with dataset median timestamp or exclude from time-series forecasting.',
    });
  }

  if (negativeQtyIndices.length > 0) {
    issues.push({
      id: 'issue-negative-quantities',
      severity: 'warning',
      type: 'negative_quantity',
      field: 'Quantity',
      message: `${negativeQtyIndices.length} line-items have negative quantities (returns or adjustments).`,
      affectedRowCount: negativeQtyIndices.length,
      affectedRowIndices: negativeQtyIndices,
      suggestedFix: 'Flag as customer returns or take absolute values depending on return policy.',
    });
  }

  if (salesOutlierIndices.length > 0) {
    issues.push({
      id: 'issue-sales-outliers',
      severity: 'info',
      type: 'outlier',
      field: 'Sales',
      message: `${salesOutlierIndices.length} transactions exceed 1.5x IQR upper threshold ($${salesIQR.upperBound.toFixed(2)}).`,
      affectedRowCount: salesOutlierIndices.length,
      affectedRowIndices: salesOutlierIndices,
      suggestedFix: 'Inspect large bulk institutional transactions; distinguish legitimate wholesale from data entry typos.',
    });
  }

  // Column inspection metadata
  const detectedColumns = rawHeaders.length > 0
    ? rawHeaders.map((col) => {
        const sampleVal = transactions[0] ? (transactions[0] as any)[col] : undefined;
        return {
          name: col,
          type: typeof sampleVal === 'number' ? 'numeric' : 'string',
          sample: sampleVal,
          missingPct: 0,
        };
      })
    : [
        { name: 'Order ID', type: 'string', sample: transactions[0]?.orderId, missingPct: 0 },
        { name: 'Order Date', type: 'date', sample: transactions[0]?.orderDate, missingPct: 0 },
        { name: 'Customer ID', type: 'string', sample: transactions[0]?.customerId, missingPct: 0 },
        { name: 'Product Name', type: 'string', sample: transactions[0]?.productName, missingPct: 0 },
        { name: 'Category', type: 'string', sample: transactions[0]?.category, missingPct: 0 },
        { name: 'Quantity', type: 'numeric', sample: transactions[0]?.quantity, missingPct: 0 },
        { name: 'Sales', type: 'numeric', sample: transactions[0]?.sales, missingPct: 0 },
        { name: 'Cost', type: 'numeric', sample: transactions[0]?.cost, missingPct: 0 },
        { name: 'Profit', type: 'numeric', sample: transactions[0]?.profit, missingPct: 0 },
        { name: 'Region', type: 'string', sample: transactions[0]?.region, missingPct: 0 },
      ];

  // Check cost coverage
  const costMissingCount = transactions.filter((t) => !t.costAvailable || t.cost === 0).length;
  const costDataAvailable = totalRows > 0 && ((totalRows - costMissingCount) / totalRows) >= 0.5;

  if (!costDataAvailable) {
    issues.unshift({
      id: 'issue-missing-cost',
      severity: 'warning',
      type: 'missing_value',
      field: 'Cost / COGS',
      message: `Cost information is unavailable or zero for ${costMissingCount} of ${totalRows} records (${Math.round((costMissingCount / totalRows) * 100)}%). Profitability metrics will be marked incomplete.`,
      affectedRowCount: costMissingCount,
      affectedRowIndices: transactions.map((t, i) => (!t.costAvailable ? i : -1)).filter((i) => i >= 0),
      suggestedFix: 'Map the appropriate wholesale Cost or COGS column in Data Management to enable accurate profit analysis.',
    });
  }

  // Calculate row counts with issues
  const rowsWithWarnings = new Set<number>();
  const rowsWithErrors = new Set<number>();
  issues.forEach((iss) => {
    iss.affectedRowIndices.forEach((idx) => {
      if (iss.severity === 'error') rowsWithErrors.add(idx);
      else if (iss.severity === 'warning') rowsWithWarnings.add(idx);
    });
  });

  const rejectedRowsCount = rowsWithErrors.size;
  const warningRowsCount = rowsWithWarnings.size;
  const validRowsCount = Math.max(0, totalRows - rejectedRowsCount);

  return {
    totalRows,
    totalColumns: detectedColumns.length,
    validRowsCount,
    warningRowsCount,
    rejectedRowsCount,
    costDataAvailable,
    detectedColumns,
    missingValuesByCol,
    duplicateRowsCount: duplicateIndices.length,
    invalidDatesCount: invalidDateIndices.length,
    negativeQuantitiesCount: negativeQtyIndices.length,
    anomalousFinancialCount: anomalousFinancialIndices.length,
    iqrOutliers: [
      {
        column: 'Sales',
        count: salesOutlierIndices.length,
        q1: salesIQR.q1,
        q3: salesIQR.q3,
        iqr: salesIQR.iqr,
        lowerBound: salesIQR.lowerBound,
        upperBound: salesIQR.upperBound,
      },
      {
        column: 'Quantity',
        count: qtyOutlierIndices.length,
        q1: qtyIQR.q1,
        q3: qtyIQR.q3,
        iqr: qtyIQR.iqr,
        lowerBound: qtyIQR.lowerBound,
        upperBound: qtyIQR.upperBound,
      },
    ],
    issues,
  };
}

/**
 * Generates downloadable Data Quality & Validation Markdown Report
 */
export function generateValidationReport(audit: DataQualityAudit, datasetName: string): string {
  const timestamp = new Date().toISOString();
  return `# RetailIQ — Data Quality & Validation Audit Report

**Dataset**: ${datasetName}
**Generated**: ${timestamp}
**Total Records Audited**: ${audit.totalRows.toLocaleString()}
**Total Mapped Attributes**: ${audit.totalColumns}

---

## 1. Executive Data Quality Health Summary
- **Valid Clean Records**: ${audit.validRowsCount.toLocaleString()} (${Math.round((audit.validRowsCount / Math.max(1, audit.totalRows)) * 100)}%)
- **Records with Warnings / Anomalies**: ${audit.warningRowsCount.toLocaleString()}
- **Critical Corrupted / Rejected Records**: ${audit.rejectedRowsCount.toLocaleString()}
- **Cost Data Coverage**: ${audit.costDataAvailable ? 'Sufficient (>= 50% mapped)' : 'INCOMPLETE (< 50% mapped — profit analysis limited)'}

---

## 2. Detected Quality Anomalies & Remediation Log
- **Duplicate Line Items**: ${audit.duplicateRowsCount} (Composite key: Order ID + Product + Customer)
- **Invalid / Missing Timestamps**: ${audit.invalidDatesCount} records
- **Customer Returns (Negative Quantity)**: ${audit.negativeQuantitiesCount} records
- **Sales IQR Outliers (Tukey 1.5x Fence)**: ${audit.iqrOutliers.find(o => o.column === 'Sales')?.count || 0} records (> $${audit.iqrOutliers.find(o => o.column === 'Sales')?.upperBound.toFixed(2) || '0.00'})

---

## 3. Detected Column Specifications
| Column Name | Inferred Type | Sample Value | Missing % |
|---|---|---|---|
${audit.detectedColumns.map(c => `| ${c.name} | ${c.type} | ${c.sample ?? 'NULL'} | ${c.missingPct}% |`).join('\n')}

---
*Report generated automatically by RetailIQ Data Quality Engine*`;
}

/**
 * Preview cleaning operations before execution
 */
export function previewCleaning(transactions: Transaction[], options: CleaningOptions): {
  retainedCount: number;
  droppedCount: number;
  correctedCount: number;
} {
  const audit = auditDataQuality(transactions);
  let droppedCount = 0;
  let correctedCount = 0;

  if (options.removeDuplicates) {
    droppedCount += audit.duplicateRowsCount;
  }
  if (options.dropMissingRequired) {
    droppedCount += audit.invalidDatesCount;
  }
  if (options.correctNegativeQuantities) {
    correctedCount += audit.negativeQuantitiesCount;
  }
  if (options.filterOutliers) {
    const salesOutliers = audit.iqrOutliers.find((o) => o.column === 'Sales')?.count || 0;
    droppedCount += salesOutliers;
  }

  const retainedCount = Math.max(0, transactions.length - droppedCount);
  return { retainedCount, droppedCount, correctedCount };
}

/**
 * Applies cleaning operations to create a cleaned dataset, keeping original untouched
 */
export function applyCleaning(transactions: Transaction[], options: CleaningOptions): Transaction[] {
  const audit = auditDataQuality(transactions);
  const duplicateSet = new Set(options.removeDuplicates ? audit.issues.find((i) => i.type === 'duplicate_row')?.affectedRowIndices || [] : []);
  const invalidDateSet = new Set(options.dropMissingRequired ? audit.issues.find((i) => i.type === 'invalid_date')?.affectedRowIndices || [] : []);
  const salesOutlier = audit.iqrOutliers.find((o) => o.column === 'Sales');

  return transactions
    .filter((tx, idx) => {
      if (duplicateSet.has(idx)) return false;
      if (invalidDateSet.has(idx)) return false;
      if (options.filterOutliers && salesOutlier && tx.sales > salesOutlier.upperBound) return false;
      return true;
    })
    .map((tx) => {
      let quantity = tx.quantity;
      let sales = tx.sales;
      let cost = tx.cost;
      let profit = tx.profit;

      if (options.correctNegativeQuantities && quantity < 0) {
        quantity = Math.abs(quantity);
        sales = Math.abs(sales);
        cost = Math.abs(cost);
        profit = Math.round((sales - cost) * 100) / 100;
      }

      return {
        ...tx,
        quantity,
        sales,
        cost,
        profit,
      };
    });
}

/**
 * Filter transactions based on global filters
 */
export function filterTransactions(transactions: Transaction[], filters: GlobalFilters): Transaction[] {
  return transactions.filter((tx) => {
    if (filters.dateRange.start && tx.orderDate < filters.dateRange.start) return false;
    if (filters.dateRange.end && tx.orderDate > filters.dateRange.end) return false;
    if (filters.category && filters.category !== 'all' && tx.category !== filters.category) return false;
    if (filters.region && filters.region !== 'all' && tx.region !== filters.region) return false;
    if (filters.product && filters.product !== 'all' && tx.productId !== filters.product) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        tx.orderId.toLowerCase().includes(q) ||
        tx.productName.toLowerCase().includes(q) ||
        tx.customerId.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

/**
 * Calculates Executive KPIs adhering strictly to domain formulas and avoiding multi-line order double counting
 */
export function calculateExecutiveKPIs(transactions: Transaction[]): ExecutiveKPIs {
  if (transactions.length === 0) {
    return {
      totalRevenue: 0,
      totalProfit: 0,
      profitAvailable: false,
      totalOrders: 0,
      totalUnitsSold: 0,
      averageOrderValue: 0,
      profitMargin: 0,
      uniqueCustomers: 0,
      averageCustomerSpending: 0,
      averageSellingPrice: 0,
      returnRatePct: 0,
      returnUnitsCount: 0,
    };
  }

  let totalRevenue = 0;
  let totalProfit = 0;
  let totalUnitsSold = 0;
  const uniqueOrderIds = new Set<string>();
  const uniqueCustomerIds = new Set<string>();
  const returnOrderIds = new Set<string>();
  let returnUnitsCount = 0;
  let rowsWithCost = 0;

  for (const tx of transactions) {
    totalRevenue += tx.sales;
    if (tx.costAvailable) {
      totalProfit += tx.profit;
      rowsWithCost++;
    }
    totalUnitsSold += tx.quantity;
    if (tx.orderId) uniqueOrderIds.add(tx.orderId);
    if (tx.customerId) uniqueCustomerIds.add(tx.customerId);

    // Track returns
    if (tx.quantity < 0) {
      if (tx.orderId) returnOrderIds.add(tx.orderId);
      returnUnitsCount += Math.abs(tx.quantity);
    }
  }

  totalRevenue = Math.round(totalRevenue * 100) / 100;
  totalProfit = Math.round(totalProfit * 100) / 100;

  const totalOrders = uniqueOrderIds.size;
  const uniqueCustomers = uniqueCustomerIds.size;
  const profitAvailable = transactions.length > 0 && (rowsWithCost / transactions.length) >= 0.4;

  // Safe division
  const averageOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;
  const profitMargin = (profitAvailable && totalRevenue > 0) ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;
  const averageCustomerSpending = uniqueCustomers > 0 ? Math.round((totalRevenue / uniqueCustomers) * 100) / 100 : 0;
  const returnRatePct = totalOrders > 0 ? Math.round((returnOrderIds.size / totalOrders) * 1000) / 10 : 0;

  const positiveSales = transactions.filter((t) => t.sales > 0).reduce((acc, t) => acc + t.sales, 0);
  const positiveUnits = transactions.filter((t) => t.quantity > 0).reduce((acc, t) => acc + t.quantity, 0);
  const averageSellingPrice = positiveUnits > 0 ? Math.round((positiveSales / positiveUnits) * 100) / 100 : 0;

  // Previous period comparison (e.g., comparing first half of active dates with second half)
  const validDates = transactions.map((t) => t.orderDate).filter(Boolean).sort();
  let previousPeriod: ExecutiveKPIs['previousPeriod'] | undefined = undefined;

  if (validDates.length > 50) {
    const minDate = validDates[0];
    const maxDate = validDates[validDates.length - 1];
    const minTime = new Date(minDate).getTime();
    const maxTime = new Date(maxDate).getTime();
    const midTime = minTime + (maxTime - minTime) / 2;
    const midDateStr = new Date(midTime).toISOString().split('T')[0];

    const prevTxs = transactions.filter((t) => t.orderDate >= minDate && t.orderDate < midDateStr);
    const currTxs = transactions.filter((t) => t.orderDate >= midDateStr && t.orderDate <= maxDate);

    if (prevTxs.length > 0 && currTxs.length > 0) {
      let prevRev = 0;
      let prevProf = 0;
      const prevOrders = new Set<string>();
      for (const t of prevTxs) {
        prevRev += t.sales;
        if (t.costAvailable) prevProf += t.profit;
        prevOrders.add(t.orderId);
      }
      let currRev = 0;
      let currProf = 0;
      for (const t of currTxs) {
        currRev += t.sales;
        if (t.costAvailable) currProf += t.profit;
      }

      const revChange = prevRev > 0 ? Math.round(((currRev - prevRev) / prevRev) * 1000) / 10 : 0;
      const profChange = (profitAvailable && prevProf > 0) ? Math.round(((currProf - prevProf) / prevProf) * 1000) / 10 : 0;

      previousPeriod = {
        totalRevenue: Math.round(prevRev * 100) / 100,
        totalProfit: profitAvailable ? Math.round(prevProf * 100) / 100 : 0,
        totalOrders: prevOrders.size,
        revenueChangePct: revChange,
        profitChangePct: profChange,
      };
    }
  }

  return {
    totalRevenue,
    totalProfit: profitAvailable ? totalProfit : 0,
    profitAvailable,
    totalOrders,
    totalUnitsSold,
    averageOrderValue,
    profitMargin,
    uniqueCustomers,
    averageCustomerSpending,
    averageSellingPrice,
    returnRatePct,
    returnUnitsCount,
    previousPeriod,
  };
}
