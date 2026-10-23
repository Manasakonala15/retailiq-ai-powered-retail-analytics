/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Filter, RotateCcw, Search, Calendar } from 'lucide-react';
import { GlobalFilters } from '../../types/retail';

interface GlobalFilterBarProps {
  filters: GlobalFilters;
  onChangeFilters: (filters: GlobalFilters) => void;
  categories: string[];
  regions: string[];
  availableDateRange: { min: string; max: string };
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  onChangeFilters,
  categories,
  regions,
  availableDateRange,
}) => {
  const activeCount =
    (filters.category !== 'all' ? 1 : 0) +
    (filters.region !== 'all' ? 1 : 0) +
    (filters.dateRange.start ? 1 : 0) +
    (filters.dateRange.end ? 1 : 0) +
    (filters.searchQuery ? 1 : 0);

  const handleReset = () => {
    onChangeFilters({
      dateRange: { start: '', end: '' },
      category: 'all',
      product: 'all',
      region: 'all',
      rfmSegment: 'all',
      searchQuery: '',
    });
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Left controls */}
      <div className="flex flex-wrap items-center gap-3 flex-1">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Filters:</span>
        </div>

        {/* Search */}
        <div className="relative min-w-[180px] max-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders, items, customers..."
            value={filters.searchQuery}
            onChange={(e) => onChangeFilters({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Date Range Start */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-500">From</span>
          <input
            type="date"
            min={availableDateRange.min}
            max={filters.dateRange.end || availableDateRange.max}
            value={filters.dateRange.start}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                dateRange: { ...filters.dateRange, start: e.target.value },
              })
            }
            className="bg-transparent text-xs text-slate-700 focus:outline-none font-mono"
          />
          <span className="text-[11px] text-slate-500">To</span>
          <input
            type="date"
            min={filters.dateRange.start || availableDateRange.min}
            max={availableDateRange.max}
            value={filters.dateRange.end}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                dateRange: { ...filters.dateRange, end: e.target.value },
              })
            }
            className="bg-transparent text-xs text-slate-700 focus:outline-none font-mono"
          />
        </div>

        {/* Category Select */}
        <select
          value={filters.category}
          onChange={(e) => onChangeFilters({ ...filters, category: e.target.value })}
          className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Region Select */}
        {regions.length > 0 && (
          <select
            value={filters.region}
            onChange={(e) => onChangeFilters({ ...filters, region: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r} Region
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Right reset */}
      {activeCount > 0 && (
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Filters ({activeCount})</span>
        </button>
      )}
    </div>
  );
};
