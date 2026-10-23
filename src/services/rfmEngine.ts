/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RFMCustomer, RFMSegmentName, Transaction } from '../types/retail';

export interface RFMAnalysisSummary {
  customers: RFMCustomer[];
  segmentCounts: Record<RFMSegmentName, number>;
  segmentRevenues: Record<RFMSegmentName, number>;
  segmentAverageSpending: Record<RFMSegmentName, number>;
  totalMonetary: number;
  recencyHistogram: { range: string; count: number }[];
  monetaryHistogram: { range: string; count: number }[];
  frequencyDistribution: { frequency: number; count: number }[];
  referenceDate: string;
}

/**
 * Assigns quantile-based 1 to 5 scores based on array of numbers
 * Higher value = higher score (for F and M).
 * For Recency, lower days = higher score.
 */
function calculateQuantileScores(values: number[], inverse = false): (val: number) => number {
  if (values.length === 0) return () => 3;
  const sorted = [...values].sort((a, b) => a - b);
  const q20 = sorted[Math.floor(sorted.length * 0.2)] ?? 0;
  const q40 = sorted[Math.floor(sorted.length * 0.4)] ?? 0;
  const q60 = sorted[Math.floor(sorted.length * 0.6)] ?? 0;
  const q80 = sorted[Math.floor(sorted.length * 0.8)] ?? 0;

  return (val: number): number => {
    let score = 1;
    if (val > q80) score = 5;
    else if (val > q60) score = 4;
    else if (val > q40) score = 3;
    else if (val > q20) score = 2;
    else score = 1;

    return inverse ? 6 - score : score;
  };
}

/**
 * Assigns customer to standard retail marketing segment based on transparent R, F, M rules
 */
export function classifyRFMSegment(rScore: number, fScore: number, mScore: number): RFMSegmentName {
  // High-Value: high spend and regular activity
  if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
    return 'High-Value Customers';
  }
  // Loyal: high frequency, steady recency
  if (fScore >= 4 && rScore >= 3) {
    return 'Loyal Customers';
  }
  // Potential Loyalists: recent buyers with moderate frequency or high monetary
  if (rScore >= 4 && (fScore >= 2 || mScore >= 3)) {
    return 'Potential Loyalists';
  }
  // Recent Customers: bought recently, but low frequency so far
  if (rScore >= 4 && fScore <= 2) {
    return 'Recent Customers';
  }
  // Needing Attention: moderate recency and frequency, slowing down
  if (rScore === 3 && fScore >= 2) {
    return 'Needing Attention';
  }
  // Inactive / At-Risk: low recency (haven't bought in a long time)
  return 'Inactive / At-Risk';
}

/**
 * Executes transparent RFM customer segmentation on active transactions
 */
export function calculateRFM(transactions: Transaction[]): RFMAnalysisSummary | null {
  // Check if customerId and orderDate are present
  const validTxs = transactions.filter((t) => t.customerId && t.orderDate && !t.customerId.includes('GUEST'));
  if (validTxs.length === 0) {
    return null;
  }

  // 1. Determine analysis reference date (max date in dataset + 1 day)
  const timestamps = validTxs.map((t) => new Date(t.orderDate).getTime()).filter((t) => !isNaN(t));
  if (timestamps.length === 0) return null;
  const maxTimestamp = Math.max(...timestamps);
  const refDate = new Date(maxTimestamp + 86400000);
  const refDateStr = refDate.toISOString().split('T')[0];

  // 2. Aggregate per customer: Recency (days), Frequency (unique orders), Monetary (sum sales)
  const customerMap = new Map<
    string,
    {
      lastTimestamp: number;
      lastDate: string;
      orderIds: Set<string>;
      totalSales: number;
    }
  >();

  for (const tx of validTxs) {
    const txTime = new Date(tx.orderDate).getTime();
    const existing = customerMap.get(tx.customerId);
    if (!existing) {
      customerMap.set(tx.customerId, {
        lastTimestamp: txTime,
        lastDate: tx.orderDate,
        orderIds: new Set([tx.orderId]),
        totalSales: tx.sales,
      });
    } else {
      if (txTime > existing.lastTimestamp) {
        existing.lastTimestamp = txTime;
        existing.lastDate = tx.orderDate;
      }
      existing.orderIds.add(tx.orderId);
      existing.totalSales += tx.sales;
    }
  }

  const recencyValues: number[] = [];
  const freqValues: number[] = [];
  const monetaryValues: number[] = [];

  const rawList: {
    customerId: string;
    recencyDays: number;
    frequencyOrders: number;
    monetaryValue: number;
    lastDate: string;
  }[] = [];

  const msPerDay = 86400000;

  for (const [customerId, data] of customerMap.entries()) {
    const recencyDays = Math.max(0, Math.floor((refDate.getTime() - data.lastTimestamp) / msPerDay));
    const frequencyOrders = data.orderIds.size;
    const monetaryValue = Math.round(data.totalSales * 100) / 100;

    recencyValues.push(recencyDays);
    freqValues.push(frequencyOrders);
    monetaryValues.push(monetaryValue);

    rawList.push({
      customerId,
      recencyDays,
      frequencyOrders,
      monetaryValue,
      lastDate: data.lastDate,
    });
  }

  // 3. Compute scoring functions
  // For recency: lower days is better -> inverse score
  const getRScore = calculateQuantileScores(recencyValues, true);
  const getFScore = calculateQuantileScores(freqValues, false);
  const getMScore = calculateQuantileScores(monetaryValues, false);

  const segmentCounts: Record<RFMSegmentName, number> = {
    'High-Value Customers': 0,
    'Loyal Customers': 0,
    'Potential Loyalists': 0,
    'Recent Customers': 0,
    'Needing Attention': 0,
    'Inactive / At-Risk': 0,
  };

  const segmentRevenues: Record<RFMSegmentName, number> = {
    'High-Value Customers': 0,
    'Loyal Customers': 0,
    'Potential Loyalists': 0,
    'Recent Customers': 0,
    'Needing Attention': 0,
    'Inactive / At-Risk': 0,
  };

  let totalMonetary = 0;

  const customers: RFMCustomer[] = rawList.map((item) => {
    const rScore = getRScore(item.recencyDays);
    const fScore = getFScore(item.frequencyOrders);
    const mScore = getMScore(item.monetaryValue);
    const segment = classifyRFMSegment(rScore, fScore, mScore);

    segmentCounts[segment]++;
    segmentRevenues[segment] = Math.round((segmentRevenues[segment] + item.monetaryValue) * 100) / 100;
    totalMonetary = Math.round((totalMonetary + item.monetaryValue) * 100) / 100;

    const avgOrderValue = item.frequencyOrders > 0 ? Math.round((item.monetaryValue / item.frequencyOrders) * 100) / 100 : 0;

    return {
      customerId: item.customerId,
      recencyDays: item.recencyDays,
      frequencyOrders: item.frequencyOrders,
      monetaryValue: item.monetaryValue,
      rScore,
      fScore,
      mScore,
      rfmScoreCombined: `${rScore}${fScore}${mScore}`,
      segment,
      lastOrderDate: item.lastDate,
      avgOrderValue,
    };
  });

  // Calculate segment average spending
  const segmentAverageSpending: Record<RFMSegmentName, number> = {} as any;
  for (const seg of Object.keys(segmentCounts) as RFMSegmentName[]) {
    const count = segmentCounts[seg];
    segmentAverageSpending[seg] = count > 0 ? Math.round((segmentRevenues[seg] / count) * 100) / 100 : 0;
  }

  // Recency histogram bins: 0-30, 31-60, 61-90, 91-180, 180+
  const recencyHistogram = [
    { range: '0–30 Days', count: customers.filter((c) => c.recencyDays <= 30).length },
    { range: '31–60 Days', count: customers.filter((c) => c.recencyDays > 30 && c.recencyDays <= 60).length },
    { range: '61–90 Days', count: customers.filter((c) => c.recencyDays > 60 && c.recencyDays <= 90).length },
    { range: '91–180 Days', count: customers.filter((c) => c.recencyDays > 90 && c.recencyDays <= 180).length },
    { range: '180+ Days', count: customers.filter((c) => c.recencyDays > 180).length },
  ];

  // Monetary histogram bins: <$200, $200-$500, $500-$1000, $1000-$2500, $2500+
  const monetaryHistogram = [
    { range: '< $200', count: customers.filter((c) => c.monetaryValue < 200).length },
    { range: '$200 – $500', count: customers.filter((c) => c.monetaryValue >= 200 && c.monetaryValue < 500).length },
    { range: '$500 – $1,000', count: customers.filter((c) => c.monetaryValue >= 500 && c.monetaryValue < 1000).length },
    { range: '$1,000 – $2,500', count: customers.filter((c) => c.monetaryValue >= 1000 && c.monetaryValue < 2500).length },
    { range: '$2,500+', count: customers.filter((c) => c.monetaryValue >= 2500).length },
  ];

  // Frequency distribution
  const freqMap: Record<number, number> = {};
  for (const c of customers) {
    freqMap[c.frequencyOrders] = (freqMap[c.frequencyOrders] || 0) + 1;
  }
  const frequencyDistribution = Object.entries(freqMap)
    .map(([f, count]) => ({ frequency: parseInt(f, 10), count }))
    .sort((a, b) => a.frequency - b.frequency);

  // Sort customers descending by monetary value
  customers.sort((a, b) => b.monetaryValue - a.monetaryValue);

  return {
    customers,
    segmentCounts,
    segmentRevenues,
    segmentAverageSpending,
    totalMonetary,
    recencyHistogram,
    monetaryHistogram,
    frequencyDistribution,
    referenceDate: refDateStr,
  };
}
