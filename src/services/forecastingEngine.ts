/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction } from '../types/retail';

export interface ForecastPoint {
  date: string;
  actual?: number;
  predicted?: number;
  baseline?: number;
  isForecast: boolean;
  lowerBound?: number;
  upperBound?: number;
}

export interface ForecastEvaluation {
  modelName: string;
  baselineName: string;
  trainCount: number;
  testCount: number;
  modelMAE: number;
  modelRMSE: number;
  baselineMAE: number;
  baselineRMSE: number;
  improvementPct: number;
  chartData: ForecastPoint[];
  insufficientData: boolean;
  notes: string[];
}

/**
 * Holt's Linear Exponential Smoothing (level + trend) with chronological train/test split
 */
export function generateSalesForecast(
  transactions: Transaction[],
  forecastHorizon = 4,
  interval: 'monthly' | 'weekly' = 'monthly'
): ForecastEvaluation {
  const validDates = transactions.filter((t) => t.orderDate && !isNaN(Date.parse(t.orderDate)));
  
  if (validDates.length < 30) {
    return {
      modelName: "Holt's Linear Trend Smoothing",
      baselineName: '3-Period Simple Moving Average (SMA)',
      trainCount: 0,
      testCount: 0,
      modelMAE: 0,
      modelRMSE: 0,
      baselineMAE: 0,
      baselineRMSE: 0,
      improvementPct: 0,
      chartData: [],
      insufficientData: true,
      notes: ['Insufficient transaction date spread. At least 6 chronological intervals are required to fit a reliable time-series model.'],
    };
  }

  // Aggregate by month (YYYY-MM)
  const aggregatedMap = new Map<string, number>();
  for (const t of validDates) {
    const key = t.orderDate.slice(0, 7);
    aggregatedMap.set(key, (aggregatedMap.get(key) || 0) + t.sales);
  }

  const sortedSeries = Array.from(aggregatedMap.entries())
    .map(([date, sales]) => ({ date, sales: Math.round(sales * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sortedSeries.length < 6) {
    return {
      modelName: "Holt's Linear Trend Smoothing",
      baselineName: '3-Period Simple Moving Average (SMA)',
      trainCount: sortedSeries.length,
      testCount: 0,
      modelMAE: 0,
      modelRMSE: 0,
      baselineMAE: 0,
      baselineRMSE: 0,
      improvementPct: 0,
      chartData: sortedSeries.map((s) => ({ date: s.date, actual: s.sales, isForecast: false })),
      insufficientData: true,
      notes: [`Dataset only spans ${sortedSeries.length} monthly intervals. Minimum 6 intervals required for chronological split.`],
    };
  }

  // Chronological Split: 75% train, 25% test
  const splitIndex = Math.max(4, Math.floor(sortedSeries.length * 0.75));
  const trainSet = sortedSeries.slice(0, splitIndex);
  const testSet = sortedSeries.slice(splitIndex);

  // 1. Train Holt's Model: alpha = 0.35, beta = 0.15
  const alpha = 0.35;
  const beta = 0.15;

  let level = trainSet[0].sales;
  let trend = (trainSet[trainSet.length - 1].sales - trainSet[0].sales) / Math.max(1, trainSet.length - 1);

  // In-sample fitting
  for (let i = 1; i < trainSet.length; i++) {
    const prevLevel = level;
    level = alpha * trainSet[i].sales + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  // 2. Evaluate on Test Set
  const testPredictions: number[] = [];
  const baselinePredictions: number[] = [];

  for (let h = 1; h <= testSet.length; h++) {
    const pred = Math.max(0, level + h * trend);
    testPredictions.push(pred);

    // Baseline: 3-period moving average of the last 3 available points
    const lookback = [...trainSet.map((s) => s.sales), ...testSet.slice(0, h - 1).map((s) => s.sales)];
    const last3 = lookback.slice(-3);
    const baseline = last3.reduce((a, b) => a + b, 0) / last3.length;
    baselinePredictions.push(baseline);
  }

  // Compute MAE & RMSE
  let testErrorAbs = 0;
  let testErrorSq = 0;
  let baseErrorAbs = 0;
  let baseErrorSq = 0;

  for (let i = 0; i < testSet.length; i++) {
    const actual = testSet[i].sales;
    const modelP = testPredictions[i];
    const baseP = baselinePredictions[i];

    testErrorAbs += Math.abs(actual - modelP);
    testErrorSq += Math.pow(actual - modelP, 2);

    baseErrorAbs += Math.abs(actual - baseP);
    baseErrorSq += Math.pow(actual - baseP, 2);
  }

  const modelMAE = Math.round((testErrorAbs / testSet.length) * 100) / 100;
  const modelRMSE = Math.round(Math.sqrt(testErrorSq / testSet.length) * 100) / 100;
  const baselineMAE = Math.round((baseErrorAbs / testSet.length) * 100) / 100;
  const baselineRMSE = Math.round(Math.sqrt(baseErrorSq / testSet.length) * 100) / 100;

  const improvementPct =
    baselineMAE > 0 ? Math.round(((baselineMAE - modelMAE) / baselineMAE) * 1000) / 10 : 0;

  // 3. Re-fit on full series to forecast future horizon
  level = sortedSeries[0].sales;
  trend = (sortedSeries[sortedSeries.length - 1].sales - sortedSeries[0].sales) / Math.max(1, sortedSeries.length - 1);
  for (let i = 1; i < sortedSeries.length; i++) {
    const prevLevel = level;
    level = alpha * sortedSeries[i].sales + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const chartData: ForecastPoint[] = [];

  // Add historical points
  sortedSeries.forEach((pt, idx) => {
    chartData.push({
      date: pt.date,
      actual: pt.sales,
      isForecast: false,
      predicted: idx >= splitIndex ? Math.round(testPredictions[idx - splitIndex] * 100) / 100 : undefined,
    });
  });

  // Generate future forecast points
  const lastDate = new Date(`${sortedSeries[sortedSeries.length - 1].date}-01`);
  for (let h = 1; h <= forecastHorizon; h++) {
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + h);
    const dateStr = nextDate.toISOString().slice(0, 7);

    const futurePred = Math.max(0, Math.round((level + h * trend) * 100) / 100);
    // Standard error margin expands with horizon sqrt(h)
    const margin = Math.round(modelRMSE * 1.25 * Math.sqrt(h) * 100) / 100;

    chartData.push({
      date: `${dateStr} (Forecast)`,
      isForecast: true,
      predicted: futurePred,
      lowerBound: Math.max(0, Math.round((futurePred - margin) * 100) / 100),
      upperBound: Math.round((futurePred + margin) * 100) / 100,
    });
  }

  return {
    modelName: "Holt's Linear Trend Smoothing (α=0.35, β=0.15)",
    baselineName: '3-Period Simple Moving Average (SMA)',
    trainCount: trainSet.length,
    testCount: testSet.length,
    modelMAE,
    modelRMSE,
    baselineMAE,
    baselineRMSE,
    improvementPct,
    chartData,
    insufficientData: false,
    notes: [
      `Evaluated on held-out ${testSet.length}-month test set using strict chronological split (no lookahead bias).`,
      `Confidence bounds widen over the forecast horizon proportional to prediction uncertainty and historical variance (RMSE $${modelRMSE.toLocaleString()}).`,
      'Model assumes linear continuation of underlying momentum and does not account for external black-swan supply shocks or unobserved competitor promos.',
    ],
  };
}
