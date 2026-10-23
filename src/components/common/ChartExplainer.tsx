/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Info } from 'lucide-react';

interface ChartExplainerProps {
  finding: string;
  detail?: string;
}

export const ChartExplainer: React.FC<ChartExplainerProps> = ({ finding, detail }) => {
  return (
    <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-md">
      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
      <div className="flex-1 leading-relaxed">
        <span className="font-semibold text-slate-800">Analytical Interpretation: </span>
        <span>{finding}</span>
        {detail && <span className="text-slate-500 ml-1">{detail}</span>}
      </div>
    </div>
  );
};
