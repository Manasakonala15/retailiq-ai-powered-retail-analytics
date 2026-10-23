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
  Legend,
} from 'recharts';
import { ChartExplainer } from '../components/common/ChartExplainer';
import { ProductPerformanceItem, Transaction } from '../types/retail';
import { Search, ArrowUpDown, AlertTriangle } from 'lucide-react';

interface ProductPerformanceProps {
  transactions: Transaction[];
}

export const ProductPerformance: React.FC<ProductPerformanceProps> = ({ transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortField, setSortField] = useState<keyof ProductPerformanceItem>('totalRevenue');
  const [sortAsc, setSortAsc] = useState(false);

  // Aggregate product level performance
  const prodMap = new Map<
    string,
    {
      id: string;
      name: string;
      category: string;
      units: number;
      revenue: number;
      cost: number;
      profit: number;
      orders: Set<string>;
    }
  >();

  const catMap = new Map<string, { revenue: number; profit: number; cost: number; units: number }>();
  let grandTotalRevenue = 0;

  for (const t of transactions) {
    grandTotalRevenue += t.sales;

    // Product
    const p = prodMap.get(t.productId) || {
      id: t.productId,
      name: t.productName,
      category: t.category,
      units: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      orders: new Set(),
    };
    p.units += t.quantity;
    p.revenue += t.sales;
    p.cost += t.cost;
    p.profit += t.profit;
    p.orders.add(t.orderId);
    prodMap.set(t.productId, p);

    // Category
    const c = catMap.get(t.category) || { revenue: 0, profit: 0, cost: 0, units: 0 };
    c.revenue += t.sales;
    c.profit += t.profit;
    c.cost += t.cost;
    c.units += t.quantity;
    catMap.set(t.category, c);
  }

  const products: ProductPerformanceItem[] = Array.from(prodMap.values()).map((p) => {
    const rev = Math.round(p.revenue * 100) / 100;
    const prof = Math.round(p.profit * 100) / 100;
    const cost = Math.round(p.cost * 100) / 100;
    const margin = rev > 0 ? Math.round((prof / rev) * 1000) / 10 : 0;
    const share = grandTotalRevenue > 0 ? Math.round((rev / grandTotalRevenue) * 1000) / 10 : 0;

    return {
      productId: p.id,
      productName: p.name,
      category: p.category,
      unitsSold: p.units,
      totalRevenue: rev,
      totalCost: cost,
      totalProfit: prof,
      profitMargin: margin,
      revenueContributionPct: share,
      ordersCount: p.orders.size,
      isNegativeProfit: prof < 0,
      isUnderperforming: prof < 0 || (margin < 10 && p.units < 15),
    };
  });

  const categories = Array.from(catMap.entries())
    .map(([category, d]) => ({
      category,
      revenue: Math.round(d.revenue),
      profit: Math.round(d.profit),
      cost: Math.round(d.cost),
      marginPct: d.revenue > 0 ? Math.round((d.profit / d.revenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Filter & Sort
  const filteredProducts = products
    .filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (
        searchTerm &&
        !p.productName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !p.category.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const handleSort = (field: keyof ProductPerformanceItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const topRevProd = [...products].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
  const topProfitProd = [...products].sort((a, b) => b.totalProfit - a.totalProfit)[0];
  const negativeProfitItems = products.filter((p) => p.isNegativeProfit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Product Performance &amp; Catalog Profitability</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Evaluating line-item revenue contribution, wholesale cost ratios, unit volume, and net profit margins
        </p>
      </div>

      {/* Top Category Profitability Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Department Profitability &amp; Cost Structures</h3>
            <p className="text-xs text-slate-500">Wholesale cost vs Gross profit across product categories</p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#475569' }} />
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
              <Bar dataKey="cost" name="Wholesale Cost" fill="#94A3B8" stackId="a" />
              <Bar dataKey="profit" name="Net Profit" fill="#10B981" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ChartExplainer
          finding={`Highest margin percentage is maintained in ${[...categories].sort((a, b) => b.marginPct - a.marginPct)[0]?.category || 'N/A'} (${[...categories].sort((a, b) => b.marginPct - a.marginPct)[0]?.marginPct || 0}% margin).`}
          detail="Stacked view illustrates the exact cost-of-goods-sold proportion relative to net profit generated per category."
        />
      </div>

      {/* Negative Margin Notice */}
      {negativeProfitItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-rose-900">Underperforming / Negative-Profit Item Warning: </span>
            <span className="text-rose-800">
              {negativeProfitItems.length} product(s) operated at a cumulative net loss. Items like "{negativeProfitItems[0].productName}" have prices below wholesale cost or excessive markdowns. Review pricing before next replenishment order.
            </span>
          </div>
        </div>
      )}

      {/* Searchable and Sortable Product Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Product Performance Catalog Matrix</h3>
            <p className="text-xs text-slate-500">Click column headers to sort by revenue, profit, units, or margin</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Departments</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('productName')}>
                  <div className="flex items-center gap-1">
                    <span>Product Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">
                    <span>Category</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSort('unitsSold')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Units Sold</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSort('totalRevenue')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Revenue</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSort('totalCost')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Cost</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSort('totalProfit')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Net Profit</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSort('profitMargin')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Margin %</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSort('revenueContributionPct')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>% Share</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredProducts.map((p) => (
                <tr key={p.productId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                    <div className="flex items-center gap-1.5">
                      {p.isNegativeProfit && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                      <span>{p.productName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-500">{p.category}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">{p.unitsSold.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-slate-900">
                    ${p.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-500">
                    ${p.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right tabular-nums font-semibold ${
                      p.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    ${p.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">{p.profitMargin}%</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-500">{p.revenueContributionPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-right">
          Showing {filteredProducts.length} product SKUs
        </div>
      </div>
    </div>
  );
};
