/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ChartExplainer } from '../components/common/ChartExplainer';
import { calculateRFM } from '../services/rfmEngine';
import { RFMSegmentName, Transaction } from '../types/retail';
import { AlertCircle, Users, DollarSign, Clock, ShieldCheck, ChevronDown } from 'lucide-react';

interface CustomerIntelligenceProps {
  transactions: Transaction[];
}

const SEGMENT_COLORS: Record<RFMSegmentName, string> = {
  'High-Value Customers': '#2563EB',
  'Loyal Customers': '#0D9488',
  'Potential Loyalists': '#8B5CF6',
  'Recent Customers': '#F59E0B',
  'Needing Attention': '#F97316',
  'Inactive / At-Risk': '#DC2626',
};

export const CustomerIntelligence: React.FC<CustomerIntelligenceProps> = ({ transactions }) => {
  const [selectedSegmentFilter, setSelectedSegmentFilter] = useState<string>('all');
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [searchCustomer, setSearchCustomer] = useState<string>('');

  const rfmSummary = calculateRFM(transactions);

  if (!rfmSummary) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-900">
        <div className="flex items-center gap-3 mb-2 font-semibold text-base">
          <AlertCircle className="w-5 h-5 text-amber-700" />
          <span>Customer Identification &amp; Date Data Required</span>
        </div>
        <p className="text-xs leading-relaxed text-amber-800">
          RFM segmentation requires both valid Customer IDs and Transaction Dates to calculate Recency, Frequency, and Monetary metrics. The current filtered dataset does not contain sufficient customer identification columns. Map your customer column in Data Management to enable this module.
        </p>
      </div>
    );
  }

  const { customers, segmentCounts, segmentRevenues, segmentAverageSpending, totalMonetary, recencyHistogram, frequencyDistribution, referenceDate } = rfmSummary;

  // Segment pie data
  const segmentPieData = (Object.keys(segmentCounts) as RFMSegmentName[]).map((seg) => ({
    name: seg,
    count: segmentCounts[seg],
    revenue: segmentRevenues[seg],
    avgSpend: segmentAverageSpending[seg],
    share: totalMonetary > 0 ? Math.round((segmentRevenues[seg] / totalMonetary) * 1000) / 10 : 0,
  }));

  // Filtered customer table
  const filteredCustomers = customers.filter((c) => {
    if (selectedSegmentFilter !== 'all' && c.segment !== selectedSegmentFilter) return false;
    if (searchCustomer && !c.customerId.toLowerCase().includes(searchCustomer.toLowerCase())) return false;
    return true;
  });

  const highValueCount = segmentCounts['High-Value Customers'] || 0;
  const highValueRev = segmentRevenues['High-Value Customers'] || 0;
  const highValueShare = totalMonetary > 0 ? Math.round((highValueRev / totalMonetary) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Customer Intelligence &amp; RFM Segmentation</h2>
            <span className="text-xs text-slate-500 font-mono">Reference Date: {referenceDate}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Behavioral segmentation evaluating Recency (days inactive), Frequency (distinct orders), and Monetary lifetime spend
          </p>
        </div>

        <button
          onClick={() => setShowRulesModal(!showRulesModal)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Scoring Rules &amp; Limitations</span>
        </button>
      </div>

      {/* Rules Explainer Box */}
      {showRulesModal && (
        <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-lg p-5 text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="font-semibold text-white text-sm">Transparent RFM Segmentation Engine Rules</h4>
            <button onClick={() => setShowRulesModal(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[11px]">
            <div className="bg-slate-800/60 p-3 rounded">
              <span className="text-blue-400 font-bold block mb-1">R - Recency Score (1-5)</span>
              <span>Quintile scored by days since last order: 5 = most recent (top 20%), 1 = least recent.</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded">
              <span className="text-emerald-400 font-bold block mb-1">F - Frequency Score (1-5)</span>
              <span>Quintile scored by total distinct orders placed by the customer account.</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded">
              <span className="text-amber-400 font-bold block mb-1">M - Monetary Score (1-5)</span>
              <span>Quintile scored by cumulative valid transaction sales volume.</span>
            </div>
          </div>
          <div className="text-slate-400 leading-relaxed text-[11px] pt-1">
            <span className="text-slate-200 font-semibold">Important Analytical Limitations:</span> RFM evaluates historical transaction trails only. An "Inactive" customer is not necessarily permanently churned (seasonal items, durable equipment, or long repurchase cycles can legitimately result in long recency intervals). Do not treat RFM scores as definitive churn forecasts without contextual domain verification.
          </div>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block mb-1">Unique Customer Accounts</span>
          <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
            {customers.length.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Total identified profiles</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block mb-1">High-Value Segment Accounts</span>
          <span className="text-xl font-bold font-mono text-blue-600 tabular-nums">
            {highValueCount.toLocaleString()} ({customers.length > 0 ? Math.round((highValueCount / customers.length) * 100) : 0}%)
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Generates {highValueShare}% of sales</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block mb-1">Average Customer Lifetime Value</span>
          <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
            ${customers.length > 0 ? (totalMonetary / customers.length).toFixed(2) : '0.00'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Cumulative spend per account</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block mb-1">At-Risk / Inactive Cohort</span>
          <span className="text-xl font-bold font-mono text-rose-600 tabular-nums">
            {segmentCounts['Inactive / At-Risk'] || 0}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">&gt;90 days since last purchase</span>
        </div>
      </div>

      {/* Segment Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Segment Breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">RFM Customer Segment Distribution</h3>
              <p className="text-xs text-slate-500">Customer account volume per classification segment</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentPieData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#475569' }} width={120} />
                <Tooltip
                  formatter={(val: any, name?: any) => [
                    name === 'count' ? `${val} Customers` : `$${Number(val).toLocaleString()}`,
                    name === 'count' ? 'Accounts' : 'Revenue',
                  ]}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} name="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartExplainer
            finding={`High-Value and Loyal customers represent ${highValueCount + (segmentCounts['Loyal Customers'] || 0)} accounts, contributing $${(highValueRev + (segmentRevenues['Loyal Customers'] || 0)).toLocaleString()} to gross revenue.`}
          />
        </div>

        {/* Segment Revenue Contribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Revenue Contribution by Segment</h3>
              <p className="text-xs text-slate-500">Percentage share of total enterprise revenue</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentPieData}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {segmentPieData.map((entry) => (
                    <Cell key={entry.name} fill={SEGMENT_COLORS[entry.name as RFMSegmentName] || '#64748B'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Revenue Contribution']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            {segmentPieData.map((s) => (
              <div key={s.name} className="flex items-center justify-between border-t border-slate-100 pt-1">
                <span className="flex items-center gap-1.5 text-slate-600 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: SEGMENT_COLORS[s.name as RFMSegmentName] }}
                  />
                  {s.name}
                </span>
                <span className="font-mono text-slate-800 font-medium">{s.share}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recency & Frequency Histograms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recency Distribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recency Distribution (Days Inactive)</h3>
              <p className="text-xs text-slate-500">Days elapsed since customer's most recent order</p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recencyHistogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} Customers`, 'Count']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartExplainer
            finding={`${recencyHistogram[0]?.count || 0} customers transacted within the last 30 days, representing the core active purchasing segment.`}
          />
        </div>

        {/* Purchase Frequency Distribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Purchase Frequency Distribution</h3>
              <p className="text-xs text-slate-500">Order count cohorts across customer accounts</p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequencyDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="frequency"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(f) => `${f} Orders`}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} Accounts`, 'Count']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartExplainer
            finding="Repeat purchase patterns illustrate customer retention efficacy; single-order dropoffs highlight initial onboarding conversion opportunity."
          />
        </div>
      </div>

      {/* Customer Account Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Highest-Spending Customer Accounts</h3>
            <p className="text-xs text-slate-500">Inspect individual account RFM scores and segment assignments</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search customer ID..."
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <select
              value={selectedSegmentFilter}
              onChange={(e) => setSelectedSegmentFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Segments</option>
              {Object.keys(segmentCounts).map((s) => (
                <option key={s} value={s}>
                  {s} ({segmentCounts[s as RFMSegmentName]})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4">Customer ID</th>
                <th className="py-2.5 px-4">Segment</th>
                <th className="py-2.5 px-4 text-center">RFM Score</th>
                <th className="py-2.5 px-4 text-right">Recency</th>
                <th className="py-2.5 px-4 text-right">Frequency</th>
                <th className="py-2.5 px-4 text-right">Total Spend</th>
                <th className="py-2.5 px-4 text-right">Avg Order Value</th>
                <th className="py-2.5 px-4 text-right">Last Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredCustomers.slice(0, 50).map((c) => (
                <tr key={c.customerId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-800">{c.customerId}</td>
                  <td className="py-2.5 px-4 font-sans">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: SEGMENT_COLORS[c.segment] }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: SEGMENT_COLORS[c.segment] }}
                      />
                      {c.segment}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums font-semibold text-slate-700">
                    {c.rfmScoreCombined}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">{c.recencyDays}d</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">{c.frequencyOrders} orders</td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-slate-900">
                    ${c.monetaryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">
                    ${c.avgOrderValue.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-400">{c.lastOrderDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-right">
          Showing {Math.min(50, filteredCustomers.length)} of {filteredCustomers.length} matching accounts
        </div>
      </div>
    </div>
  );
};
