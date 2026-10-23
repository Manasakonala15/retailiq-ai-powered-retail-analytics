/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  buildAnalyticsPayload,
  fetchAIInsights,
  generateRuleBasedInsights,
} from '../services/aiService';
import { generateSalesForecast } from '../services/forecastingEngine';
import { AIInsightItem, Transaction } from '../types/retail';
import {
  Sparkles,
  RefreshCw,
  Code2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  HelpCircle,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface AIBusinessInsightsProps {
  transactions: Transaction[];
}

export const AIBusinessInsights: React.FC<AIBusinessInsightsProps> = ({ transactions }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [insights, setInsights] = useState<AIInsightItem[]>([]);
  const [insightSource, setInsightSource] = useState<'gemini-3.8-flash' | 'rule-based-engine'>('rule-based-engine');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPayloadInspector, setShowPayloadInspector] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'forecasting'>('insights');

  const payload = buildAnalyticsPayload(transactions);
  const forecast = generateSalesForecast(transactions, 4, 'monthly');

  // Load insights on mount or when transactions change
  useEffect(() => {
    let isMounted = true;
    const runAnalysis = async () => {
      setLoading(true);
      const res = await fetchAIInsights(payload);
      if (isMounted) {
        setInsights(res.insights);
        setInsightSource(res.source);
        setLoading(false);
      }
    };
    runAnalysis();
    return () => {
      isMounted = false;
    };
  }, [transactions.length]);

  const handleRefreshAI = async () => {
    setLoading(true);
    const res = await fetchAIInsights(payload);
    setInsights(res.insights);
    setInsightSource(res.source);
    setLoading(false);
  };

  const filteredInsights = insights.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">AI Business Insights &amp; Decision Intelligence</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded font-mono font-medium ${
                insightSource === 'gemini-3.8-flash'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              Engine: {insightSource === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash' : 'Deterministic Rule Engine'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Evidence-backed strategic findings and operational recommendations strictly grounded in verified dataset metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPayloadInspector(!showPayloadInspector)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Inspect Grounding Stats</span>
          </button>
          <button
            onClick={handleRefreshAI}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Evaluating...' : 'Re-run Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium w-fit">
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'insights' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Executive Insights &amp; Recommendations ({insights.length})
        </button>
        <button
          onClick={() => setActiveTab('forecasting')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'forecasting' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sales Time-Series Forecasting (Holt's Model)
        </button>
      </div>

      {/* Grounding Payload Modal / Drawer */}
      {showPayloadInspector && (
        <div className="bg-slate-900 text-slate-200 rounded-lg p-5 shadow-lg border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h4 className="font-semibold text-white text-sm">Grounded Statistical Payload Sent to Model</h4>
              <p className="text-slate-400 text-[11px]">
                AI only receives verified numerical aggregations, preventing metric hallucination.
              </p>
            </div>
            <button onClick={() => setShowPayloadInspector(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <pre className="max-h-72 overflow-y-auto bg-slate-950 p-4 rounded text-blue-300 text-[11px] leading-relaxed">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      )}

      {/* Main Tab 1: Structured Insights */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Insights' },
              { id: 'Key Finding', label: 'Key Findings' },
              { id: 'Revenue Trend', label: 'Revenue Trends' },
              { id: 'Customer Behavior', label: 'Customer Behavior' },
              { id: 'Product Performance', label: 'Product Performance' },
              { id: 'Profitability Risk', label: 'Profitability Risks' },
              { id: 'Recommendation', label: 'Actionable Recommendations' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInsights.map((item, idx) => {
              const isRecommendation = item.category === 'Recommendation';
              const isRisk = item.category === 'Profitability Risk';

              return (
                <div
                  key={idx}
                  className={`bg-white border rounded-lg p-5 shadow-sm space-y-3 flex flex-col justify-between ${
                    isRecommendation
                      ? 'border-blue-200 bg-blue-50/20'
                      : isRisk
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] font-mono">
                        {item.category}
                      </span>
                      <span className="text-slate-400 text-[11px]">Item #{idx + 1}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>

                    {/* Finding */}
                    <div className="text-xs text-slate-700 leading-relaxed">
                      <strong className="text-slate-900">Finding: </strong>
                      {item.finding}
                    </div>

                    {/* Supporting Metric */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono text-slate-800">
                      <span className="text-slate-500 font-sans block text-[10px] uppercase font-semibold">
                        Grounded Metric / Evidence:
                      </span>
                      {item.supportingMetric}
                    </div>

                    {/* Business Interpretation */}
                    <div className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">Business Interpretation: </strong>
                      {item.businessInterpretation}
                    </div>
                  </div>

                  {/* Suggested Action & Limitation */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-start gap-1.5 text-blue-900 bg-blue-50 p-2 rounded">
                      <Lightbulb className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold">Suggested Action: </strong>
                        <span>{item.suggestedAction}</span>
                      </div>
                    </div>

                    {item.limitationOrUncertainty && (
                      <div className="text-[11px] text-slate-500 italic flex items-start gap-1">
                        <span className="font-semibold text-slate-600 not-italic">Limitation:</span>
                        <span>{item.limitationOrUncertainty}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Tab 2: Sales Forecasting */}
      {activeTab === 'forecasting' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Sales Time-Series Forecasting ({forecast.modelName})
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological train/test split ({forecast.trainCount} train months, {forecast.testCount} test months) vs Baseline SMA
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
                  <span className="text-slate-400 block text-[10px]">Model MAE</span>
                  <span className="font-bold text-slate-800">${forecast.modelMAE.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
                  <span className="text-slate-400 block text-[10px]">Model RMSE</span>
                  <span className="font-bold text-slate-800">${forecast.modelRMSE.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
                  <span className="text-slate-400 block text-[10px]">Baseline MAE (SMA)</span>
                  <span className="font-bold text-slate-800">${forecast.baselineMAE.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Forecast Chart */}
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecast.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(val: any, name?: any) => [
                      val ? `$${Number(val).toLocaleString()}` : 'N/A',
                      name === 'actual'
                        ? 'Actual Historical Sales'
                        : name === 'predicted'
                        ? 'Predicted / Forecast'
                        : String(name || ''),
                    ]}
                    contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area
                    dataKey="upperBound"
                    name="Upper Bound (Confidence Interval)"
                    fill="#93C5FD"
                    fillOpacity={0.2}
                    stroke="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Historical Sales"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted / Forecast Horizon"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Model Notes & Limitations */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800 block">Methodological Rigor &amp; Limitations:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                {forecast.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
