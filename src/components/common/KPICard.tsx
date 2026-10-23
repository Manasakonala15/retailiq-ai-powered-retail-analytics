/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowUpRight, ArrowDownRight, HelpCircle } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtext?: string;
  changePct?: number;
  changeLabel?: string;
  formulaNote?: string;
  prefix?: string;
  suffix?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtext,
  changePct,
  changeLabel = 'vs prev half',
  formulaNote,
  prefix = '',
  suffix = '',
}) => {
  const hasChange = typeof changePct === 'number';
  const isPositive = hasChange && changePct >= 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm transition-all hover:border-slate-300">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
        <span className="truncate">{title}</span>
        {formulaNote && (
          <span className="group relative cursor-help text-slate-400 hover:text-slate-600">
            <HelpCircle className="w-3.5 h-3.5" />
            <div className="absolute right-0 bottom-full mb-1 hidden w-48 rounded bg-slate-900 p-2 text-[11px] text-white shadow-md group-hover:block z-50">
              {formulaNote}
            </div>
          </span>
        )}
      </div>

      <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
        {prefix}
        {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
        {suffix}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
        {hasChange ? (
          <div className="flex items-center gap-1 font-mono">
            <span
              className={`flex items-center text-xs font-medium ${
                isPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {isPositive ? '+' : ''}
              {changePct.toFixed(1)}%
            </span>
            <span className="text-slate-400 text-[11px]">{changeLabel}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">{subtext || 'Grounded in dataset'}</span>
        )}
      </div>
    </div>
  );
};
