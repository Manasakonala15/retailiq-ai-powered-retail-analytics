/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  orderId: string;
  orderDate: string; // YYYY-MM-DD
  customerId: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  sales: number;
  cost: number;
  profit: number;
  costAvailable: boolean;
  isReturn: boolean;
  region: string;
  state?: string;
  paymentMethod?: string;
  discount?: number;
  isOutlier?: boolean;
  hasDataIssue?: boolean;
  issueTypes?: string[];
}

export type CanonicalField =
  | 'orderId'
  | 'orderDate'
  | 'customerId'
  | 'productId'
  | 'productName'
  | 'category'
  | 'quantity'
  | 'unitPrice'
  | 'sales'
  | 'cost'
  | 'profit'
  | 'region'
  | 'state'
  | 'paymentMethod'
  | 'discount';

export type ColumnMapping = Record<CanonicalField, string>;

export interface DataQualityIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  type: 'missing_value' | 'invalid_date' | 'duplicate_row' | 'negative_quantity' | 'negative_financial' | 'outlier';
  field: string;
  message: string;
  affectedRowCount: number;
  affectedRowIndices: number[];
  suggestedFix: string;
}

export interface DataQualityAudit {
  totalRows: number;
  totalColumns: number;
  validRowsCount: number;
  warningRowsCount: number;
  rejectedRowsCount: number;
  costDataAvailable: boolean;
  detectedColumns: { name: string; type: string; sample: any; missingPct: number }[];
  missingValuesByCol: Record<string, number>;
  duplicateRowsCount: number;
  invalidDatesCount: number;
  negativeQuantitiesCount: number;
  anomalousFinancialCount: number;
  iqrOutliers: {
    column: string;
    count: number;
    q1: number;
    q3: number;
    iqr: number;
    lowerBound: number;
    upperBound: number;
  }[];
  issues: DataQualityIssue[];
  cleaningActionsLog?: string[];
}

export interface CleaningOptions {
  removeDuplicates: boolean;
  dropMissingRequired: boolean;
  imputeMissingNumeric: boolean;
  correctNegativeQuantities: boolean;
  filterOutliers: boolean;
}

export interface ExecutiveKPIs {
  totalRevenue: number;
  totalProfit: number;
  profitAvailable: boolean;
  totalOrders: number;
  totalUnitsSold: number;
  averageOrderValue: number;
  profitMargin: number;
  uniqueCustomers: number;
  averageCustomerSpending: number;
  averageSellingPrice: number;
  returnRatePct: number;
  returnUnitsCount: number;
  previousPeriod?: {
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    revenueChangePct: number;
    profitChangePct: number;
  };
}

export interface GlobalFilters {
  dateRange: { start: string; end: string };
  category: string;
  product: string;
  region: string;
  rfmSegment: string;
  searchQuery: string;
}

export type RFMSegmentName =
  | 'High-Value Customers'
  | 'Loyal Customers'
  | 'Potential Loyalists'
  | 'Recent Customers'
  | 'Needing Attention'
  | 'Inactive / At-Risk';

export interface RFMCustomer {
  customerId: string;
  recencyDays: number;
  frequencyOrders: number;
  monetaryValue: number;
  rScore: number; // 1-5
  fScore: number; // 1-5
  mScore: number; // 1-5
  rfmScoreCombined: string;
  segment: RFMSegmentName;
  lastOrderDate: string;
  avgOrderValue: number;
}

export interface ProductPerformanceItem {
  productId: string;
  productName: string;
  category: string;
  unitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  revenueContributionPct: number;
  ordersCount: number;
  isNegativeProfit: boolean;
  isUnderperforming: boolean;
}

export interface RegionalMetricItem {
  region: string;
  revenue: number;
  profit: number;
  orders: number;
  unitsSold: number;
  aov: number;
  profitMargin: number;
  revenueSharePct: number;
  topCategory: string;
}

export interface EDANumericalStats {
  field: string;
  count: number;
  mean: number;
  std: number;
  min: number;
  q25: number;
  median: number;
  q75: number;
  max: number;
  iqr: number;
  skewness: number;
}

export interface AIInsightItem {
  title: string;
  category: 'Key Finding' | 'Revenue Trend' | 'Customer Behavior' | 'Product Performance' | 'Profitability Risk' | 'Recommendation';
  finding: string;
  supportingMetric: string;
  businessInterpretation: string;
  suggestedAction: string;
  limitationOrUncertainty: string;
}
