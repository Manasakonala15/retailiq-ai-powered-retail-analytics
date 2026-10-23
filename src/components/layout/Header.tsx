/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, ChevronRight, FileText, Database } from 'lucide-react';
import { NavigationPage } from './Sidebar';

interface HeaderProps {
  currentPage: NavigationPage;
  onExportCSV: (type: 'original' | 'cleaned' | 'filtered') => void;
  onExportReport: () => void;
  recordCount: number;
}

const PAGE_TITLES: Record<NavigationPage, string> = {
  overview: 'Executive Overview',
  sales: 'Sales Analytics & Revenue Drivers',
  customers: 'Customer Intelligence & RFM Segmentation',
  products: 'Product & Category Performance',
  regional: 'Regional Market Analytics',
  eda: 'Exploratory Data Analysis (EDA)',
  quality: 'Data Quality & Validation Audit',
  'ai-insights': 'AI Decision Intelligence & Recommendations',
  'data-management': 'Dataset Management & SQL Engine',
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onExportCSV,
  onExportReport,
  recordCount,
}) => {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6 shrink-0 z-10">
      {/* Zone 1: Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-slate-800">RetailIQ</span>
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-slate-600 font-medium">{PAGE_TITLES[currentPage]}</span>
        <span className="text-slate-400 font-normal">·</span>
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          {recordCount.toLocaleString()} records active
        </span>
      </div>

      {/* Zone 2: Primary Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExportReport}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
          title="Download comprehensive analytical markdown summary report"
        >
          <FileText className="w-3.5 h-3.5 text-slate-600" />
          <span>Executive Report</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>

          {exportOpen && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-50 text-xs font-medium text-slate-700"
              onMouseLeave={() => setExportOpen(false)}
            >
              <button
                onClick={() => {
                  onExportCSV('filtered');
                  setExportOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <span>Export Filtered CSV</span>
                <span className="text-[10px] text-slate-400 font-mono">Current</span>
              </button>
              <button
                onClick={() => {
                  onExportCSV('cleaned');
                  setExportOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <span>Export Cleaned CSV</span>
                <span className="text-[10px] text-slate-400 font-mono">Deduplicated</span>
              </button>
              <button
                onClick={() => {
                  onExportCSV('original');
                  setExportOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <span>Export Original CSV</span>
                <span className="text-[10px] text-slate-400 font-mono">Raw</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
