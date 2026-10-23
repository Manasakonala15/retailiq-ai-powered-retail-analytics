/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
} from 'recharts';
import { ChartExplainer } from '../components/common/ChartExplainer';
import { Transaction } from '../types/retail';

interface SalesAnalyticsProps {
  transactions: Transaction[];
}

export const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ transactions }) => {
  const [timeCadence, setTimeCadence] = useState<'monthly' | 'weekly'>('monthly');
  const [productRankingMetric, setProductRankingMetric] = useState<'revenue' | 'quantity' | 'profit'>('revenue');

  // Time grouping
  const timeMap = new Map<string, { revenue: number; profit: number; orders: Set<string>; units: number }>();
  const catMap = new Map<string, { revenue: number; profit: number; cost: number; units: number }>();
  const payMap = new Map<string, { revenue: number; orders: Set<string> }>();
  const prodMap = new Map<string, { id: string; name: string; category: string; revenue: number; profit: number; quantity: number }>();

  let totalSales = 0;

  for (const t of transactions) {
    totalSales += t.sales;

    // Time grouping
    if (t.orderDate) {
      let key = t.orderDate.slice(0, 7); // monthly
      if (timeCadence === 'weekly') {
        // week bucket (approximate 7-day interval)
        const d = new Date(t.orderDate);
        const day = d.getDate();
        const weekNum = Math.ceil(day / 7);
        key = `${t.orderDate.slice(0, 7)}-W${weekNum}`;
      }
      const currTime = timeMap.get(key) || { revenue: 0, profit: 0, orders: new Set(), units: 0 };
      currTime.revenue += t.sales;
      currTime.profit += t.profit;
      currTime.orders.add(t.orderId);
      currTime.units += t.quantity;
      timeMap.set(key, currTime);
    }

    // Category grouping
    const currCat = catMap.get(t.category) || { revenue: 0, profit: 0, cost: 0, units: 0 };
    currCat.revenue += t.sales;
    currCat.profit += t.profit;
    currCat.cost += t.cost;
    currCat.units += t.quantity;
    catMap.set(t.category, currCat);

    // Payment method
    if (t.paymentMethod) {
      const currPay = payMap.get(t.paymentMethod) || { revenue: 0, orders: new Set() };
      currPay.revenue += t.sales;
      currPay.orders.add(t.orderId);
      payMap.set(t.paymentMethod, currPay);
    }

    // Product grouping
    const currProd = prodMap.get(t.productId) || {
      id: t.productId,
      name: t.productName,
      category: t.category,
      revenue: 0,
      profit: 0,
      quantity: 0,
    };
    currProd.revenue += t.sales;
    currProd.profit += t.profit;
    currProd.quantity += t.quantity;
    prodMap.set(t.productId, currProd);
  }

  // Formatted data series
  const trendSeries = Array.from(timeMap.entries())
    .map(([period, d]) => ({
      period,
      revenue: Math.round(d.revenue),
      profit: Math.round(d.profit),
      aov: d.orders.size > 0 ? Math.round(d.revenue / d.orders.size) : 0,
      orders: d.orders.size,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const categorySeries = Array.from(catMap.entries())
    .map(([category, d]) => ({
      category,
      revenue: Math.round(d.revenue),
      profit: Math.round(d.profit),
      cost: Math.round(d.cost),
      marginPct: d.revenue > 0 ? Math.round((d.profit / d.revenue) * 1000) / 10 : 0,
      revenueShare: totalSales > 0 ? Math.round((d.revenue / totalSales) * 1000) / 10 : 0,
      units: d.units,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const paymentSeries = Array.from(payMap.entries())
    .map(([method, d]) => ({
      method,
      revenue: Math.round(d.revenue),
      orders: d.orders.size,
      aov: d.orders.size > 0 ? Math.round(d.revenue / d.orders.size) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const allProducts = Array.from(prodMap.values()).map((p) => ({
    ...p,
    revenue: Math.round(p.revenue * 100) / 100,
    profit: Math.round(p.profit * 100) / 100,
    marginPct: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 1000) / 10 : 0,
  }));

  const top10Products = [...allProducts]
    .sort((a, b) => {
      if (productRankingMetric === 'revenue') return b.revenue - a.revenue;
      if (productRankingMetric === 'profit') return b.profit - a.profit;
      return b.quantity - a.quantity;
    })
    .slice(0, 10);

  const negativeProfitProducts = allProducts.filter((p) => p.profit < 0);

  const topCat = categorySeries[0] || { category: 'N/A', revenue: 0, marginPct: 0 };
  const highestAOVPeriod = [...trendSeries].sort((a, b) => b.aov - a.aov)[0];

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Sales Trend & Profitability Analysis</h2>
          <p className="text-xs text-slate-500">Deconstructing revenue drivers, ticket size, and catalog velocity</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Time Interval:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-medium">
            <button
              onClick={() => setTimeCadence('monthly')}
              className={`px-3 py-1 rounded transition-colors ${
                timeCadence === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setTimeCadence('weekly')}
              className={`px-3 py-1 rounded transition-colors ${
                timeCadence === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly Buckets
            </button>
          </div>
        </div>
      </div>

      {/* Revenue & Profit Trends */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Revenue, Profit & AOV Trajectory</h3>
            <p className="text-xs text-slate-500">Sales volume (bars) vs Net profit and Average Order Value (lines)</p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `$${val}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(val: any, name?: any) => [
                  `$${Number(val).toLocaleString()}`,
                  name === 'revenue' ? 'Revenue' : name === 'profit' ? 'Profit' : 'AOV',
                ]}
                contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar yAxisId="left" dataKey="revenue" name="Sales Revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey="profit" name="Net Profit" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="aov" name="AOV ($)" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {highestAOVPeriod && (
          <ChartExplainer
            finding={`Average Order Value reached an apex of $${highestAOVPeriod.aov} in ${highestAOVPeriod.period}.`}
            detail="The dual-axis trend reveals whether seasonal volume expansions are driven by increased order count or larger cart sizes."
          />
        )}
      </div>

      {/* Category Performance & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Revenue vs Profit */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Category Revenue vs Gross Profit</h3>
              <p className="text-xs text-slate-500">Gross revenue paired against realized margin</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySeries} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                <YAxis
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`]}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="revenue" name="Sales Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Net Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartExplainer
            finding={`${topCat.category} leads all categories generating $${topCat.revenue.toLocaleString()} (${topCat.revenueShare}% share) with ${topCat.marginPct}% profit margin.`}
          />
        </div>

        {/* Payment Methods */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Sales by Payment Method</h3>
              <p className="text-xs text-slate-500">Tender type volume and respective ticket sizes</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentSeries} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis dataKey="method" type="category" tick={{ fontSize: 11, fill: '#475569' }} width={100} />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Processed Volume']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#6366F1" radius={[0, 4, 4, 0]} name="Volume ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartExplainer
            finding={`Primary payment channel "${paymentSeries[0]?.method || 'N/A'}" processed $${paymentSeries[0]?.revenue.toLocaleString()} with an average order value of $${paymentSeries[0]?.aov}.`}
          />
        </div>
      </div>

      {/* Top 10 Products Ranking Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Top 10 Products Ranking</h3>
            <p className="text-xs text-slate-500">Filter ranking by gross revenue, unit volume, or net profitability</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-medium">
            <button
              onClick={() => setProductRankingMetric('revenue')}
              className={`px-3 py-1 rounded transition-colors ${
                productRankingMetric === 'revenue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Revenue
            </button>
            <button
              onClick={() => setProductRankingMetric('quantity')}
              className={`px-3 py-1 rounded transition-colors ${
                productRankingMetric === 'quantity' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Units Sold
            </button>
            <button
              onClick={() => setProductRankingMetric('profit')}
              className={`px-3 py-1 rounded transition-colors ${
                productRankingMetric === 'profit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Profit
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">Units Sold</th>
                <th className="py-2.5 px-4 text-right">Total Revenue</th>
                <th className="py-2.5 px-4 text-right">Net Profit</th>
                <th className="py-2.5 px-4 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {top10Products.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 text-center text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-800">{p.name}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-500">{p.category}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">{p.quantity.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-900 font-semibold">
                    ${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right tabular-nums font-semibold ${
                      p.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    ${p.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">{p.marginPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Negative Margin Alert Box */}
      {negativeProfitProducts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-rose-900">
              Negative-Profit Products Alert ({negativeProfitProducts.length} Items)
            </h4>
            <span className="text-xs text-rose-700 font-medium">Pricing Review Required</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed mb-4">
            The following catalog products have net negative cumulative gross profit due to promotional discount depth or wholesale acquisition costs exceeding unit price:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {negativeProfitProducts.map((p) => (
              <div key={p.id} className="bg-white border border-rose-200 rounded-md p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-900 block">{p.name}</span>
                  <span className="text-slate-500 text-[11px]">{p.category} · {p.quantity} units sold</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-rose-700 font-bold block">-${Math.abs(p.profit).toFixed(2)}</span>
                  <span className="text-slate-400 text-[10px]">Net Loss</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
