/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EDANumericalStats, Transaction } from '../types/retail';

export interface CorrelationPair {
  var1: string;
  var2: string;
  pearsonR: number;
  strength: 'Strong' | 'Moderate' | 'Weak' | 'None';
  direction: 'Positive' | 'Negative' | 'Neutral';
}

export interface BoxPlotMetrics {
  field: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outlierCount: number;
  lowerBound: number;
  upperBound: number;
}

export interface EDAResults {
  sampleCount: number;
  numericalStats: EDANumericalStats[];
  boxPlots: BoxPlotMetrics[];
  correlations: CorrelationPair[];
  categoryDistribution: { category: string; count: number; revenue: number; percentage: number }[];
  paymentDistribution: { method: string; count: number; percentage: number }[];
  quantityVsSalesSample: { quantity: number; sales: number; category: string }[];
  salesVsProfitSample: { sales: number; profit: number; category: string }[];
  monthlyRevenueSeries: { month: string; revenue: number; profit: number; orders: number }[];
}

/**
 * Calculates mean, sample standard deviation, quartiles, IQR, and Pearson skewness coefficient
 */
export function computeDescriptiveStats(field: string, values: number[]): EDANumericalStats {
  const n = values.length;
  if (n === 0) {
    return {
      field,
      count: 0,
      mean: 0,
      std: 0,
      min: 0,
      q25: 0,
      median: 0,
      q75: 0,
      max: 0,
      iqr: 0,
      skewness: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Standard deviation
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
  const std = Math.sqrt(variance);

  const min = sorted[0];
  const max = sorted[n - 1];

  const q25 = sorted[Math.floor(n * 0.25)] ?? min;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const q75 = sorted[Math.floor(n * 0.75)] ?? max;
  const iqr = Math.round((q75 - q25) * 100) / 100;

  // Pearson's median skewness coefficient: 3 * (mean - median) / std
  const skewness = std > 0 ? Math.round(((3 * (mean - median)) / std) * 100) / 100 : 0;

  return {
    field,
    count: n,
    mean: Math.round(mean * 100) / 100,
    std: Math.round(std * 100) / 100,
    min: Math.round(min * 100) / 100,
    q25: Math.round(q25 * 100) / 100,
    median: Math.round(median * 100) / 100,
    q75: Math.round(q75 * 100) / 100,
    max: Math.round(max * 100) / 100,
    iqr,
    skewness,
  };
}

/**
 * Calculates Pearson correlation coefficient (r) between two numeric series
 */
export function calculatePearsonR(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let xDenom = 0;
  let yDenom = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    numerator += xDiff * yDiff;
    xDenom += xDiff * xDiff;
    yDenom += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xDenom * yDenom);
  if (denominator === 0) return 0;

  return Math.round((numerator / denominator) * 1000) / 1000;
}

/**
 * Executes full EDA on active dataset
 */
export function runEDA(transactions: Transaction[]): EDAResults {
  const valid = transactions.filter((t) => !isNaN(t.sales) && !isNaN(t.quantity));

  const quantities = valid.map((t) => t.quantity);
  const prices = valid.map((t) => t.unitPrice);
  const sales = valid.map((t) => t.sales);
  const costs = valid.map((t) => t.cost);
  const profits = valid.map((t) => t.profit);
  const discounts = valid.map((t) => t.discount || 0);

  const numericalStats: EDANumericalStats[] = [
    computeDescriptiveStats('Sales ($)', sales),
    computeDescriptiveStats('Profit ($)', profits),
    computeDescriptiveStats('Quantity', quantities),
    computeDescriptiveStats('Unit Price ($)', prices),
    computeDescriptiveStats('Cost ($)', costs),
    computeDescriptiveStats('Discount Rate', discounts),
  ];

  // Box Plots metrics
  const boxPlots: BoxPlotMetrics[] = numericalStats.map((stat) => {
    const iqr = stat.q75 - stat.q25;
    const lowerBound = stat.q25 - 1.5 * iqr;
    const upperBound = stat.q75 + 1.5 * iqr;
    const values = stat.field.includes('Sales')
      ? sales
      : stat.field.includes('Profit')
      ? profits
      : stat.field.includes('Quantity')
      ? quantities
      : prices;
    const outlierCount = values.filter((v) => v < lowerBound || v > upperBound).length;

    return {
      field: stat.field,
      min: stat.min,
      q1: stat.q25,
      median: stat.median,
      q3: stat.q75,
      max: stat.max,
      outlierCount,
      lowerBound: Math.round(lowerBound * 100) / 100,
      upperBound: Math.round(upperBound * 100) / 100,
    };
  });

  // Correlation pairs
  const vars: { label: string; values: number[] }[] = [
    { label: 'Sales', values: sales },
    { label: 'Profit', values: profits },
    { label: 'Quantity', values: quantities },
    { label: 'Unit Price', values: prices },
    { label: 'Cost', values: costs },
    { label: 'Discount', values: discounts },
  ];

  const correlations: CorrelationPair[] = [];
  for (let i = 0; i < vars.length; i++) {
    for (let j = i + 1; j < vars.length; j++) {
      const r = calculatePearsonR(vars[i].values, vars[j].values);
      const absR = Math.abs(r);
      const strength = absR >= 0.7 ? 'Strong' : absR >= 0.4 ? 'Moderate' : absR >= 0.15 ? 'Weak' : 'None';
      const direction = r > 0.05 ? 'Positive' : r < -0.05 ? 'Negative' : 'Neutral';

      correlations.push({
        var1: vars[i].label,
        var2: vars[j].label,
        pearsonR: r,
        strength,
        direction,
      });
    }
  }

  // Category distribution
  const catMap = new Map<string, { count: number; revenue: number }>();
  let totalRev = 0;
  for (const t of valid) {
    totalRev += t.sales;
    const curr = catMap.get(t.category) || { count: 0, revenue: 0 };
    curr.count++;
    curr.revenue += t.sales;
    catMap.set(t.category, curr);
  }

  const categoryDistribution = Array.from(catMap.entries()).map(([category, val]) => ({
    category,
    count: val.count,
    revenue: Math.round(val.revenue * 100) / 100,
    percentage: totalRev > 0 ? Math.round((val.revenue / totalRev) * 1000) / 10 : 0,
  }));

  // Payment methods
  const payMap = new Map<string, number>();
  for (const t of valid) {
    const m = t.paymentMethod || 'Unspecified';
    payMap.set(m, (payMap.get(m) || 0) + 1);
  }
  const paymentDistribution = Array.from(payMap.entries()).map(([method, count]) => ({
    method,
    count,
    percentage: Math.round((count / valid.length) * 1000) / 10,
  }));

  // Scatter plot representative sample (downsample if over 200 points for smooth SVG rendering)
  const step = Math.max(1, Math.floor(valid.length / 150));
  const quantityVsSalesSample: { quantity: number; sales: number; category: string }[] = [];
  const salesVsProfitSample: { sales: number; profit: number; category: string }[] = [];

  for (let i = 0; i < valid.length; i += step) {
    const t = valid[i];
    quantityVsSalesSample.push({ quantity: t.quantity, sales: t.sales, category: t.category });
    salesVsProfitSample.push({ sales: t.sales, profit: t.profit, category: t.category });
  }

  // Monthly revenue time-series
  const monthMap = new Map<string, { revenue: number; profit: number; orders: Set<string> }>();
  for (const t of valid) {
    if (!t.orderDate) continue;
    const monthKey = t.orderDate.slice(0, 7); // YYYY-MM
    const curr = monthMap.get(monthKey) || { revenue: 0, profit: 0, orders: new Set() };
    curr.revenue += t.sales;
    curr.profit += t.profit;
    curr.orders.add(t.orderId);
    monthMap.set(monthKey, curr);
  }

  const monthlyRevenueSeries = Array.from(monthMap.entries())
    .map(([month, val]) => ({
      month,
      revenue: Math.round(val.revenue * 100) / 100,
      profit: Math.round(val.profit * 100) / 100,
      orders: val.orders.size,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    sampleCount: valid.length,
    numericalStats,
    boxPlots,
    correlations,
    categoryDistribution,
    paymentDistribution,
    quantityVsSalesSample,
    salesVsProfitSample,
    monthlyRevenueSeries,
  };
}
