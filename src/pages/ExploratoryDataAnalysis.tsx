/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { ChartExplainer } from '../components/common/ChartExplainer';
import { runEDA } from '../services/edaEngine';
import { Transaction } from '../types/retail';
import { Download, FileSpreadsheet, Activity, HelpCircle } from 'lucide-react';

interface ExploratoryDataAnalysisProps {
  transactions: Transaction[];
}

export const ExploratoryDataAnalysis: React.FC<ExploratoryDataAnalysisProps> = ({ transactions }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'correlations' | 'distributions' | 'scatter'>('stats');

  const eda = runEDA(transactions);

  const handleDownloadEDAReport = () => {
    const lines = [
      '# RetailIQ — Exploratory Data Analysis (EDA) Statistical Audit',
      `Generated on: ${new Date().toISOString()}`,
      `Total Valid Transactions Audited: ${eda.sampleCount.toLocaleString()}`,
      '',
      '## 1. Descriptive Numerical Statistics',
      'Field,Count,Mean,Std Dev,Min,Q25 (25th),Median,Q75 (75th),Max,IQR,Skewness',
      ...eda.numericalStats.map(
        (s) =>
          `"${s.field}",${s.count},${s.mean},${s.std},${s.min},${s.q25},${s.median},${s.q75},${s.max},${s.iqr},${s.skewness}`
      ),
      '',
      '## 2. Pearson Correlation Coefficients (r)',
      'Variable 1,Variable 2,Pearson r,Correlation Strength,Direction',
      ...eda.correlations.map((c) => `"${c.var1}","${c.var2}",${c.pearsonR},${c.strength},${c.direction}`),
      '',
      '## 3. Box Plot Quartiles & 1.5x IQR Outlier Detection',
      'Field,Min,Q1,Median,Q3,Max,IQR Lower Bound,IQR Upper Bound,Outlier Count',
      ...eda.boxPlots.map(
        (b) => `"${b.field}",${b.min},${b.q1},${b.median},${b.q3},${b.max},${b.lowerBound},${b.upperBound},${b.outlierCount}`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `retail_eda_report_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with Download Report */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Exploratory Data Analysis (EDA) Module</h2>
            <span className="text-xs text-slate-500 font-mono">Sample N = {eda.sampleCount.toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Parametric summary statistics, IQR outlier bounds, Pearson correlation matrix, and bivariate scatter analysis
          </p>
        </div>

        <button
          onClick={handleDownloadEDAReport}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>Download EDA Summary (.md)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium w-fit">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'stats' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Descriptive Statistics
        </button>
        <button
          onClick={() => setActiveTab('correlations')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'correlations' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pearson Correlation Matrix
        </button>
        <button
          onClick={() => setActiveTab('distributions')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'distributions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Box Plots &amp; IQR Outliers
        </button>
        <button
          onClick={() => setActiveTab('scatter')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'scatter' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Bivariate Scatter Relationships
        </button>
      </div>

      {/* Tab 1: Descriptive Statistics Table */}
      {activeTab === 'stats' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Numerical Variable Descriptive Statistics</h3>
            <p className="text-xs text-slate-500">
              Parametric measures (Mean, Std Dev) paired with non-parametric quantiles (Median, IQR, Skewness)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Metric Dimension</th>
                  <th className="py-2.5 px-4 text-right">Sample N</th>
                  <th className="py-2.5 px-4 text-right">Mean (μ)</th>
                  <th className="py-2.5 px-4 text-right">Std Dev (σ)</th>
                  <th className="py-2.5 px-4 text-right">Min</th>
                  <th className="py-2.5 px-4 text-right">Q25 (25th)</th>
                  <th className="py-2.5 px-4 text-right">Median (Q2)</th>
                  <th className="py-2.5 px-4 text-right">Q75 (75th)</th>
                  <th className="py-2.5 px-4 text-right">Max</th>
                  <th className="py-2.5 px-4 text-right">IQR (Q3-Q1)</th>
                  <th className="py-2.5 px-4 text-right">Skewness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {eda.numericalStats.map((s) => (
                  <tr key={s.field} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-800">{s.field}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-500">{s.count.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-slate-900">
                      {s.mean.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">{s.std.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-500">{s.min.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">{s.q25.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-blue-600">{s.median.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">{s.q75.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-500">{s.max.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">{s.iqr.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">{s.skewness.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-800">Interpretation Note: </span>
            A positive skewness indicates right-skewed distributions where high-value orders stretch the mean above the median. In retail transactions, sales distributions almost universally exhibit positive right-tail skewness due to bulk multi-item purchases.
          </div>
        </div>
      )}

      {/* Tab 2: Pearson Correlation Matrix */}
      {activeTab === 'correlations' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Bivariate Pearson Correlation Matrix</h3>
            <p className="text-xs text-slate-500">
              Measures linear association between numerical variables (-1.0 to +1.0). Correlation does NOT imply causation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {eda.correlations.map((c, i) => {
              const isPositive = c.pearsonR > 0;
              const absVal = Math.abs(c.pearsonR);
              const colorBg =
                absVal > 0.6
                  ? isPositive
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800';

              return (
                <div key={i} className={`border rounded-lg p-3.5 flex items-center justify-between ${colorBg}`}>
                  <div>
                    <span className="font-semibold text-xs block">
                      {c.var1} <span className="text-slate-400 font-normal">vs</span> {c.var2}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {c.strength} {c.direction} Association
                    </span>
                  </div>
                  <div className="font-mono text-base font-bold tabular-nums">
                    {c.pearsonR > 0 ? '+' : ''}
                    {c.pearsonR.toFixed(3)}
                  </div>
                </div>
              );
            })}
          </div>

          <ChartExplainer
            finding="Strongest correlation occurs between Sales and Profit, demonstrating steady gross margins across transaction tiers."
            detail="Reminder: Statistical correlation identifies co-movement in the sample data, but does not prove that changing one variable causes an automated increase in the other without controlled A/B testing."
          />
        </div>
      )}

      {/* Tab 3: Box Plots & IQR Outlier Bounds */}
      {activeTab === 'distributions' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Box Plot Quartiles &amp; IQR Outlier Thresholds</h3>
            <p className="text-xs text-slate-500">
              Evaluates Tukey 1.5x IQR fences [Q1 - 1.5×IQR, Q3 + 1.5×IQR] to identify statistical anomalies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eda.boxPlots.map((b) => (
              <div key={b.field} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-slate-800">{b.field}</span>
                  <span className="text-[11px] text-slate-500 font-mono">{b.outlierCount} outliers detected</span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Upper Fence (Q3 + 1.5 IQR):</span>
                    <strong className="text-slate-900">{b.upperBound.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>75th Percentile (Q3):</span>
                    <span>{b.q3.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-blue-700 font-semibold">
                    <span>Median (Q2):</span>
                    <span>{b.median.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>25th Percentile (Q1):</span>
                    <span>{b.q1.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Lower Fence (Q1 - 1.5 IQR):</span>
                    <strong className="text-slate-900">{b.lowerBound.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  Data points outside [{b.lowerBound.toFixed(1)}, {b.upperBound.toFixed(1)}] are statistical outliers. In retail, these frequently represent genuine bulk B2B purchases rather than errors.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Bivariate Scatter Relationships */}
      {activeTab === 'scatter' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quantity vs Sales */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Quantity Sold vs Gross Sales</h3>
            <p className="text-xs text-slate-500 mb-4">Sample dispersion of transaction line volume against revenue</p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="quantity" name="Quantity" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="sales" name="Sales ($)" tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Scatter name="Transactions" data={eda.quantityVsSalesSample} fill="#2563EB" opacity={0.65} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <ChartExplainer finding="Visualizes tiered pricing: higher unit prices create steeper upward rays; high-quantity points on the far right reflect bulk commercial purchases." />
          </div>

          {/* Sales vs Profit */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Sales Revenue vs Net Profit</h3>
            <p className="text-xs text-slate-500 mb-4">Gross line revenue plotted against realized profit</p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="sales" name="Sales ($)" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="profit" name="Profit ($)" tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Scatter name="Transactions" data={eda.salesVsProfitSample} fill="#10B981" opacity={0.65} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <ChartExplainer finding="Points dipping below the zero line on the Y-axis indicate loss-leader transactions where discounts reduced net profit into negative territory." />
          </div>
        </div>
      )}
    </div>
  );
};
