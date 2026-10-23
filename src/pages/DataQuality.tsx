/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  auditDataQuality,
  previewCleaning,
  applyCleaning,
} from '../services/dataProcessor';
import { CleaningOptions, DataQualityIssue, Transaction } from '../types/retail';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  RotateCcw,
  Sparkles,
  Eye,
  Info,
} from 'lucide-react';

interface DataQualityProps {
  originalTransactions: Transaction[];
  activeTransactions: Transaction[];
  onApplyCleanedData: (cleaned: Transaction[]) => void;
  onRestoreOriginal: () => void;
  rawHeaders?: string[];
  isCleaned: boolean;
}

export const DataQuality: React.FC<DataQualityProps> = ({
  originalTransactions,
  activeTransactions,
  onApplyCleanedData,
  onRestoreOriginal,
  rawHeaders = [],
  isCleaned,
}) => {
  const [cleaningOptions, setCleaningOptions] = useState<CleaningOptions>({
    removeDuplicates: true,
    dropMissingRequired: true,
    imputeMissingNumeric: true,
    correctNegativeQuantities: true,
    filterOutliers: false,
  });

  const [inspectingIssue, setInspectingIssue] = useState<DataQualityIssue | null>(null);

  const audit = auditDataQuality(originalTransactions, rawHeaders);
  const preview = previewCleaning(originalTransactions, cleaningOptions);

  const handleApplyCleaning = () => {
    const cleaned = applyCleaning(originalTransactions, cleaningOptions);
    onApplyCleanedData(cleaned);
  };

  const handleDownloadCleaned = () => {
    const cleaned = isCleaned ? activeTransactions : applyCleaning(originalTransactions, cleaningOptions);
    const headers = [
      'Order ID',
      'Order Date',
      'Customer ID',
      'Product ID',
      'Product Name',
      'Category',
      'Quantity',
      'Unit Price',
      'Sales',
      'Cost',
      'Profit',
      'Region',
      'State',
      'Payment Method',
      'Discount',
    ];
    const rows = cleaned.map((t) => [
      t.orderId,
      t.orderDate,
      t.customerId,
      t.productId,
      `"${t.productName.replace(/"/g, '""')}"`,
      t.category,
      t.quantity,
      t.unitPrice,
      t.sales,
      t.cost,
      t.profit,
      t.region,
      t.state || '',
      t.paymentMethod || '',
      t.discount || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `retail_cleaned_dataset_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Data Quality &amp; Hygiene Audit</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono ${
                isCleaned ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isCleaned ? 'Active: Cleaned Dataset' : 'Active: Raw Original Dataset'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated schema verification, missing value tracking, duplicate inspection, and reversible cleaning
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCleaned && (
            <button
              onClick={onRestoreOriginal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revert to Raw</span>
            </button>
          )}
          <button
            onClick={handleDownloadCleaned}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Cleaned CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block mb-1">Total Records Audited</span>
          <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
            {audit.totalRows.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">{audit.totalColumns} mapped columns</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block mb-1">Duplicate Rows</span>
          <span className="text-xl font-bold font-mono text-amber-600 tabular-nums">
            {audit.duplicateRowsCount}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Identical order line items</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block mb-1">Invalid / Null Dates</span>
          <span className="text-xl font-bold font-mono text-rose-600 tabular-nums">
            {audit.invalidDatesCount}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Unparseable timestamps</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 font-medium block mb-1">Negative Values</span>
          <span className="text-xl font-bold font-mono text-slate-800 tabular-nums">
            {audit.negativeQuantitiesCount}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Returns / adjustments</span>
        </div>
      </div>

      {/* Detected Issues List */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Detected Data Quality Issues</h3>
            <p className="text-xs text-slate-500">Click "Inspect Records" to view specific affected transaction lines</p>
          </div>
          <span className="text-xs font-mono text-slate-400">{audit.issues.length} hygiene alerts</span>
        </div>

        {audit.issues.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Zero critical data quality defects detected. All mandatory fields passed validation.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {audit.issues.map((issue) => (
              <div
                key={issue.id}
                className="border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {issue.severity === 'error' ? (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : issue.severity === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-xs text-slate-800 block">
                      [{issue.field}] {issue.message}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{issue.suggestedFix}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500">
                    {issue.affectedRowCount} affected row(s)
                  </span>
                  <button
                    onClick={() => setInspectingIssue(issue)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded font-medium transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inspected Records Modal / Drawer */}
      {inspectingIssue && (
        <div className="bg-slate-900 text-white rounded-lg p-5 shadow-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h4 className="font-semibold text-sm">
                Inspecting Affected Records: {inspectingIssue.field}
              </h4>
              <p className="text-xs text-slate-400">{inspectingIssue.message}</p>
            </div>
            <button
              onClick={() => setInspectingIssue(null)}
              className="text-slate-400 hover:text-white px-2 py-1 text-xs"
            >
              ✕ Close
            </button>
          </div>

          <div className="overflow-x-auto max-h-60 font-mono text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-800 text-slate-400 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Row Index</th>
                  <th className="py-2 px-3">Order ID</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Product Name</th>
                  <th className="py-2 px-3 text-right">Quantity</th>
                  <th className="py-2 px-3 text-right">Sales</th>
                  <th className="py-2 px-3 text-right">Profit</th>
                  <th className="py-2 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {inspectingIssue.affectedRowIndices.map((rowIdx) => {
                  const tx = originalTransactions[rowIdx];
                  if (!tx) return null;
                  return (
                    <tr key={rowIdx} className="hover:bg-slate-800/60">
                      <td className="py-1.5 px-3 text-slate-500">#{rowIdx + 1}</td>
                      <td className="py-1.5 px-3">{tx.orderId}</td>
                      <td className="py-1.5 px-3">{tx.customerId}</td>
                      <td className="py-1.5 px-3 truncate max-w-[180px]">{tx.productName}</td>
                      <td className="py-1.5 px-3 text-right">{tx.quantity}</td>
                      <td className="py-1.5 px-3 text-right">${tx.sales.toFixed(2)}</td>
                      <td className="py-1.5 px-3 text-right">${tx.profit.toFixed(2)}</td>
                      <td className="py-1.5 px-3 text-slate-400">{tx.orderDate || 'MISSING'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cleaning Pipeline & Preview (No silent discarding!) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Reversible Data Cleaning &amp; Preprocessing Pipeline
          </h3>
          <p className="text-xs text-slate-500">
            Configure proposed transformations. Review the exact record impact before applying. Original raw data is never permanently overwritten.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={cleaningOptions.removeDuplicates}
              onChange={(e) => setCleaningOptions({ ...cleaningOptions, removeDuplicates: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800 block">Deduplicate Identical Order Lines</span>
              <span className="text-slate-500 text-[11px]">Removes {audit.duplicateRowsCount} duplicate items to prevent double-counting</span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={cleaningOptions.correctNegativeQuantities}
              onChange={(e) => setCleaningOptions({ ...cleaningOptions, correctNegativeQuantities: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800 block">Harmonize Negative Return Quantities</span>
              <span className="text-slate-500 text-[11px]">Normalizes {audit.negativeQuantitiesCount} negative return records into positive values</span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={cleaningOptions.dropMissingRequired}
              onChange={(e) => setCleaningOptions({ ...cleaningOptions, dropMissingRequired: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800 block">Drop Records with Unparseable Dates</span>
              <span className="text-slate-500 text-[11px]">Excludes {audit.invalidDatesCount} records with corrupted or missing date timestamps</span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={cleaningOptions.filterOutliers}
              onChange={(e) => setCleaningOptions({ ...cleaningOptions, filterOutliers: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800 block">Exclude 1.5x IQR Statistical Outliers</span>
              <span className="text-slate-500 text-[11px]">Filters {audit.iqrOutliers[0]?.count || 0} extreme sales records (optional)</span>
            </div>
          </label>
        </div>

        {/* Preview Summary Strip */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 font-sans">Pipeline Proposed Outcome: </span>
            <span className="text-slate-800 font-semibold">{preview.retainedCount.toLocaleString()} rows retained</span>
            <span className="text-slate-400"> ({preview.droppedCount} dropped, {preview.correctedCount} corrected)</span>
          </div>

          <button
            onClick={handleApplyCleaning}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-medium rounded-md transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Apply Cleaning Pipeline</span>
          </button>
        </div>
      </div>
    </div>
  );
};
