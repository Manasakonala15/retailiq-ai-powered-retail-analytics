/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Package,
  Globe2,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Database,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';

export type NavigationPage =
  | 'overview'
  | 'sales'
  | 'customers'
  | 'products'
  | 'regional'
  | 'eda'
  | 'quality'
  | 'ai-insights'
  | 'data-management';

interface SidebarProps {
  currentPage: NavigationPage;
  onSelectPage: (page: NavigationPage) => void;
  datasetName: string;
  totalRecords: number;
  onResetToSampleData: () => void;
  isCustomDataset: boolean;
}

const NAV_ITEMS: { id: NavigationPage; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales Analytics', icon: TrendingUp },
  { id: 'customers', label: 'Customer Intelligence', icon: Users },
  { id: 'products', label: 'Product Performance', icon: Package },
  { id: 'regional', label: 'Regional Analytics', icon: Globe2 },
  { id: 'eda', label: 'Exploratory Data Analysis', icon: BarChart3 },
  { id: 'quality', label: 'Data Quality & Audit', icon: CheckCircle2 },
  { id: 'ai-insights', label: 'AI Business Insights', icon: Sparkles },
  { id: 'data-management', label: 'Data & SQL Management', icon: Database },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  datasetName,
  totalRecords,
  onResetToSampleData,
  isCustomDataset,
}) => {
  return (
    <aside className="w-64 bg-[#0F172A] text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800">
        <img
          src="/src/assets/images/retailiq_emblem_1792750197629.jpg"
          alt="RetailIQ Emblem"
          className="w-8 h-8 rounded-md object-cover border border-slate-700 shadow-sm"
          referrerPolicy="no-referrer"
        />
        <div className="flex flex-col">
          <span className="font-semibold text-white tracking-tight text-base font-sans leading-none">
            RetailIQ
          </span>
          <span className="text-[11px] text-slate-400 font-sans tracking-wide mt-1">
            Decision Intelligence
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
          Analytics Modules
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Dataset Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#0B132B]/60">
        <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
              Active Dataset
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {isCustomDataset ? 'CSV Upload' : 'Demo Mode'}
            </span>
          </div>
          <p className="text-white font-medium truncate text-xs">{datasetName}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/60 text-[11px] text-slate-400">
            <span className="tabular-nums font-mono text-slate-300">{totalRecords.toLocaleString()} rows</span>
            {isCustomDataset && (
              <button
                onClick={onResetToSampleData}
                title="Restore synthetic demonstration dataset"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
