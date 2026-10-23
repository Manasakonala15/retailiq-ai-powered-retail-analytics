/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { KPICard } from '../components/common/KPICard';
import { ChartExplainer } from '../components/common/ChartExplainer';
import { ExecutiveKPIs, Transaction } from '../types/retail';

interface ExecutiveOverviewProps {
  transactions: Transaction[];
  kpis: ExecutiveKPIs;
}

const CATEGORY_COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({ transactions, kpis }) => {
  // Aggregate monthly series for timeline
  const monthMap = new Map<string, { revenue: number; profit: number; orders: Set<string> }>();
  const catMap = new Map<string, { revenue: number; profit: number }>();
  const prodMap = new Map<string, { name: string; revenue: number; profit: number }>();
  const regMap = new Map<string, number>();

  for (const t of transactions) {
    if (t.orderDate) {
      const m = t.orderDate.slice(0, 7);
      const curr = monthMap.get(m) || { revenue: 0, profit: 0, orders: new Set() };
      curr.revenue += t.sales;
      curr.profit += t.profit;
      curr.orders.add(t.orderId);
      monthMap.set(m, curr);
    }

    const c = catMap.get(t.category) || { revenue: 0, profit: 0 };
    c.revenue += t.sales;
    c.profit += t.profit;
    catMap.set(t.category, c);

    const p = prodMap.get(t.productId) || { name: t.productName, revenue: 0, profit: 0 };
    p.revenue += t.sales;
    p.profit += t.profit;
    prodMap.set(t.productId, p);

    regMap.set(t.region, (regMap.get(t.region) || 0) + t.sales);
  }

  const monthlyTimeline = Array.from(monthMap.entries())
    .map(([month, d]) => ({
      month,
      revenue: Math.round(d.revenue),
      profit: Math.round(d.profit),
      marginPct: d.revenue > 0 ? Math.round((d.profit / d.revenue) * 1000) / 10 : 0,
      orders: d.orders.size,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const categoryBreakdown = Array.from(catMap.entries())
    .map(([category, d]) => ({
      category,
      revenue: Math.round(d.revenue),
      profit: Math.round(d.profit),
      marginPct: d.revenue > 0 ? Math.round((d.profit / d.revenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const topProducts = Array.from(prodMap.values())
    .map((p) => ({
      name: p.name.length > 22 ? p.name.slice(0, 22) + '...' : p.name,
      revenue: Math.round(p.revenue),
      profit: Math.round(p.profit),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const regionalData = Array.from(regMap.entries())
    .map(([region, revenue]) => ({
      region,
      revenue: Math.round(revenue),
      share: kpis.totalRevenue > 0 ? Math.round((revenue / kpis.totalRevenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const topCat = categoryBreakdown[0] || { category: 'N/A', revenue: 0, marginPct: 0 };
  const topReg = regionalData[0] || { region: 'N/A', revenue: 0, share: 0 };
  const highestMonth = [...monthlyTimeline].sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={kpis.totalRevenue}
          prefix="$"
          changePct={kpis.previousPeriod?.revenueChangePct}
          formulaNote="Sum of line sales across all transactions: Σ(Quantity × Price × (1 - Discount))"
        />
        <KPICard
          title="Total Net Profit"
          value={kpis.totalProfit}
          prefix="$"
          changePct={kpis.previousPeriod?.profitChangePct}
          formulaNote="Sum of transaction profit: Σ(Revenue - Wholesale Cost)"
        />
        <KPICard
          title="Average Order Value (AOV)"
          value={kpis.averageOrderValue}
          prefix="$"
          subtext={`Across ${kpis.totalOrders.toLocaleString()} distinct orders`}
          formulaNote="Total Revenue ÷ Distinct Order IDs (avoids multi-item double counting)"
        />
        <KPICard
          title="Gross Profit Margin"
          value={kpis.profitMargin}
          suffix="%"
          subtext={`Avg spend $${kpis.averageCustomerSpending.toFixed(2)}/customer`}
          formulaNote="(Total Profit ÷ Total Revenue) × 100"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Distinct Orders</div>
            <div className="text-xl font-bold font-mono text-slate-800 tabular-nums">
              {kpis.totalOrders.toLocaleString()}
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">Deduplicated</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Units Sold</div>
            <div className="text-xl font-bold font-mono text-slate-800 tabular-nums">
              {kpis.totalUnitsSold.toLocaleString()}
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">Catalog items</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Active Customer Accounts</div>
            <div className="text-xl font-bold font-mono text-slate-800 tabular-nums">
              {kpis.uniqueCustomers.toLocaleString()}
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">Unique profiles</span>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Revenue & Profit Progression</h3>
              <p className="text-xs text-slate-500">Monthly gross sales volume vs net operating profit</p>
            </div>
            <div className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
              Monthly Trend
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: any, name?: any) => [
                    `$${Number(val).toLocaleString()}`,
                    name === 'revenue' ? 'Sales Revenue' : 'Net Profit',
                  ]}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="revenue" name="Sales Revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="profit"
                  name="Net Profit"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {highestMonth && (
            <ChartExplainer
              finding={`Peak revenue occurred in ${highestMonth.month} generating $${highestMonth.revenue.toLocaleString()} with $${highestMonth.profit.toLocaleString()} net profit.`}
              detail={`Operating profit margin across months averaged ${kpis.profitMargin}% with healthy correlation to transaction volume.`}
            />
          )}
        </div>

        {/* Regional Contribution (1 col) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Regional Revenue Share</h3>
                <p className="text-xs text-slate-500">Distribution across active sales territories</p>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionalData}
                    dataKey="revenue"
                    nameKey="region"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {regionalData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-2">
              {regionalData.map((r, i) => (
                <div key={r.region} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                    />
                    <span className="text-slate-700 font-medium">{r.region}</span>
                  </div>
                  <div className="font-mono text-slate-600">
                    ${r.revenue.toLocaleString()} ({r.share}%)
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ChartExplainer
            finding={`The ${topReg.region} territory leads all markets with ${topReg.share}% of gross company revenue.`}
          />
        </div>
      </div>

      {/* Secondary Charts: Category Revenue & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Revenue by Product Category</h3>
              <p className="text-xs text-slate-500">Sales volume and department profit margin</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: '#475569' }} width={90} />
                <Tooltip
                  formatter={(val: any, name?: any) => [
                    `$${Number(val).toLocaleString()}`,
                    name === 'revenue' ? 'Sales Revenue' : 'Gross Profit',
                  ]}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Sales Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartExplainer
            finding={`${topCat.category} generates highest category turnover at $${topCat.revenue.toLocaleString()} with a ${topCat.marginPct}% profit margin.`}
          />
        </div>

        {/* Top 5 Products */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Top 5 Best-Selling Products</h3>
              <p className="text-xs text-slate-500">Catalog items contributing highest gross proceeds</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} width={130} />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#0D9488" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartExplainer
            finding={`Top SKU "${topProducts[0]?.name || 'N/A'}" anchors the product catalog with $${topProducts[0]?.revenue.toLocaleString()} in revenue.`}
          />
        </div>
      </div>
    </div>
  );
};
