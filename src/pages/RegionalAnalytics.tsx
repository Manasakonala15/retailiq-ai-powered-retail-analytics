/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { ChartExplainer } from '../components/common/ChartExplainer';
import { RegionalMetricItem, Transaction } from '../types/retail';
import { Globe2, MapPin, TrendingUp, AlertCircle } from 'lucide-react';

interface RegionalAnalyticsProps {
  transactions: Transaction[];
}

export const RegionalAnalytics: React.FC<RegionalAnalyticsProps> = ({ transactions }) => {
  // Check if geographical columns exist and are populated
  const validGeoTxs = transactions.filter((t) => t.region && t.region !== 'Standard' && t.region.trim() !== '');

  if (validGeoTxs.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center max-w-lg mx-auto my-12">
        <Globe2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">Geographic Data Not Available</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          The uploaded dataset does not contain mapped region or state attributes. To enable regional analytics, map a Region column in the Data Management page. The application strictly relies on genuine dataset columns and will not invent synthetic location records.
        </p>
      </div>
    );
  }

  // Aggregate by region
  const regMap = new Map<
    string,
    {
      revenue: number;
      profit: number;
      orders: Set<string>;
      units: number;
      catMap: Map<string, number>;
    }
  >();

  let totalSales = 0;

  for (const t of validGeoTxs) {
    totalSales += t.sales;
    const curr = regMap.get(t.region) || {
      revenue: 0,
      profit: 0,
      orders: new Set(),
      units: 0,
      catMap: new Map(),
    };
    curr.revenue += t.sales;
    curr.profit += t.profit;
    curr.orders.add(t.orderId);
    curr.units += t.quantity;
    curr.catMap.set(t.category, (curr.catMap.get(t.category) || 0) + t.sales);
    regMap.set(t.region, curr);
  }

  const regionalMetrics: RegionalMetricItem[] = Array.from(regMap.entries()).map(([region, d]) => {
    const rev = Math.round(d.revenue * 100) / 100;
    const prof = Math.round(d.profit * 100) / 100;
    const orders = d.orders.size;
    const aov = orders > 0 ? Math.round((rev / orders) * 100) / 100 : 0;
    const margin = rev > 0 ? Math.round((prof / rev) * 1000) / 10 : 0;
    const share = totalSales > 0 ? Math.round((rev / totalSales) * 1000) / 10 : 0;

    let topCategory = 'N/A';
    let topCatRev = 0;
    for (const [cat, cRev] of d.catMap.entries()) {
      if (cRev > topCatRev) {
        topCatRev = cRev;
        topCategory = cat;
      }
    }

    return {
      region,
      revenue: rev,
      profit: prof,
      orders,
      unitsSold: d.units,
      aov,
      profitMargin: margin,
      revenueSharePct: share,
      topCategory,
    };
  });

  regionalMetrics.sort((a, b) => b.revenue - a.revenue);

  const topRegion = regionalMetrics[0];
  const lowestRegion = regionalMetrics[regionalMetrics.length - 1];

  // Category by region data for stacked comparison
  const allCategories = Array.from(new Set(validGeoTxs.map((t) => t.category)));
  const catByRegionChartData = regionalMetrics.map((r) => {
    const row: any = { region: r.region };
    const curr = regMap.get(r.region);
    for (const c of allCategories) {
      row[c] = Math.round(curr?.catMap.get(c) || 0);
    }
    return row;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Regional Analytics &amp; Geographic Performance</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Comparative market performance evaluating sales volume, profit margins, and basket efficiency per region
        </p>
      </div>

      {/* Regional KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {regionalMetrics.map((r) => (
          <div key={r.region} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {r.region} Region
              </span>
              <span className="font-mono text-slate-500">{r.revenueSharePct}% share</span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              ${r.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>
                Profit: <strong className="text-emerald-700">${r.profit.toLocaleString()}</strong> ({r.profitMargin}%)
              </span>
              <span className="font-mono">AOV ${r.aov}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Regional Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Profit by Region */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Regional Revenue &amp; Net Profit</h3>
              <p className="text-xs text-slate-500">Sales turnover vs operating profit across territories</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalMetrics} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#475569' }} />
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
                <Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Net Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartExplainer
            finding={`Highest performing territory is ${topRegion.region} ($${topRegion.revenue.toLocaleString()} revenue, ${topRegion.profitMargin}% margin), while ${lowestRegion.region} produces $${lowestRegion.revenue.toLocaleString()}.`}
          />
        </div>

        {/* Category Contribution by Region */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Category Mix by Region</h3>
              <p className="text-xs text-slate-500">Sales volume per product category across markets</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catByRegionChartData} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#475569' }} />
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
                {allCategories.map((c, i) => (
                  <Bar
                    key={c}
                    dataKey={c}
                    stackId="cat"
                    fill={['#2563EB', '#0D9488', '#F59E0B', '#8B5CF6', '#EC4899'][i % 5]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartExplainer
            finding={`Leading product vertical in ${topRegion.region} is "${topRegion.topCategory}", matching customer demographic demand.`}
          />
        </div>
      </div>

      {/* Regional Performance Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Regional Benchmark Scorecard</h3>
          <p className="text-xs text-slate-500">Comprehensive breakdown of order volume, revenue share, and ticket efficiency</p>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Region</th>
              <th className="py-2.5 px-4 text-right">Orders</th>
              <th className="py-2.5 px-4 text-right">Units Sold</th>
              <th className="py-2.5 px-4 text-right">Total Revenue</th>
              <th className="py-2.5 px-4 text-right">Net Profit</th>
              <th className="py-2.5 px-4 text-right">Profit Margin</th>
              <th className="py-2.5 px-4 text-right">Average Order Value</th>
              <th className="py-2.5 px-4 text-right">Revenue Share</th>
              <th className="py-2.5 px-4">Top Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {regionalMetrics.map((r) => (
              <tr key={r.region} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2.5 px-4 font-sans font-medium text-slate-800">{r.region}</td>
                <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">{r.orders.toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">{r.unitsSold.toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-slate-900">
                  ${r.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-emerald-700">
                  ${r.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">{r.profitMargin}%</td>
                <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">${r.aov.toFixed(2)}</td>
                <td className="py-2.5 px-4 text-right tabular-nums text-slate-900 font-semibold">{r.revenueSharePct}%</td>
                <td className="py-2.5 px-4 font-sans text-slate-600">{r.topCategory}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
