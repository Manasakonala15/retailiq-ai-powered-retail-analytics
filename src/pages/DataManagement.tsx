/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  CANONICAL_FIELDS,
  autoDetectColumnMapping,
  parseRawRecords,
} from '../services/dataProcessor';
import {
  PREDEFINED_QUERIES,
  SQLPredefinedQuery,
  SQLQueryResult,
  executeSQLQuery,
  initializeDatabase,
} from '../services/sqliteService';
import { CanonicalField, ColumnMapping, Transaction } from '../types/retail';
import {
  Upload,
  Database,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Download,
  Terminal,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DataManagementProps {
  transactions: Transaction[];
  onUploadDataset: (newTransactions: Transaction[], filename: string, rawHeaders: string[]) => void;
  onResetToSampleData: () => void;
  isCustomDataset: boolean;
  datasetName: string;
}

export const DataManagement: React.FC<DataManagementProps> = ({
  transactions,
  onUploadDataset,
  onResetToSampleData,
  isCustomDataset,
  datasetName,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'sql' | 'schema'>('sql');

  // CSV Upload state
  const [uploadedHeaders, setUploadedHeaders] = useState<string[]>([]);
  const [uploadedRawRows, setUploadedRawRows] = useState<Record<string, any>[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({} as ColumnMapping);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // SQL State
  const [selectedPredefinedId, setSelectedPredefinedId] = useState<number>(1);
  const [sqlQuery, setSqlQuery] = useState<string>(PREDEFINED_QUERIES[0].sql);
  const [sqlResult, setSqlResult] = useState<SQLQueryResult | null>(null);
  const [sqlLoading, setSqlLoading] = useState<boolean>(false);
  const [dbReady, setDbReady] = useState<boolean>(false);

  // Initialize SQLite database on mount / transactions update
  useEffect(() => {
    let isMounted = true;
    const setupDB = async () => {
      try {
        await initializeDatabase(transactions);
        if (isMounted) {
          setDbReady(true);
          // Run default query
          const res = await executeSQLQuery(PREDEFINED_QUERIES[0].sql, transactions);
          if (isMounted) setSqlResult(res);
        }
      } catch (err: any) {
        console.error('Database initialization error:', err);
      }
    };
    setupDB();
    return () => {
      isMounted = false;
    };
  }, [transactions.length]);

  // Handle CSV file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadedFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setUploadError('Uploaded CSV file contains no data rows.');
          return;
        }

        const headers = results.meta.fields || Object.keys(results.data[0] || {});
        setUploadedHeaders(headers);
        setUploadedRawRows(results.data as Record<string, any>[]);

        // Auto detect mapping
        const detected = autoDetectColumnMapping(headers);
        setColumnMapping(detected);
        setMappingModalOpen(true);
      },
      error: (err) => {
        setUploadError(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  // Confirm mapping and apply dataset
  const handleConfirmMapping = () => {
    try {
      const parsedTransactions = parseRawRecords(uploadedRawRows, columnMapping);
      onUploadDataset(parsedTransactions, uploadedFileName, uploadedHeaders);
      setMappingModalOpen(false);
    } catch (err: any) {
      setUploadError(`Error applying column mappings: ${err.message}`);
    }
  };

  // Run SQL
  const handleRunSQL = async (queryToRun?: string) => {
    const q = queryToRun || sqlQuery;
    setSqlLoading(true);
    const res = await executeSQLQuery(q, transactions);
    setSqlResult(res);
    setSqlLoading(false);
  };

  const handleSelectPredefined = (query: SQLPredefinedQuery) => {
    setSelectedPredefinedId(query.id);
    setSqlQuery(query.sql);
    handleRunSQL(query.sql);
  };

  const handleExportSQLCSV = () => {
    if (!sqlResult || sqlResult.values.length === 0) return;
    const rows = sqlResult.values.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','));
    const content = [sqlResult.columns.join(','), ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sql_query_result_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Data Management &amp; SQL Engine</h2>
            <span className="text-xs px-2.5 py-0.5 rounded font-mono bg-emerald-100 text-emerald-800 font-medium">
              SQLite (WebAssembly) Engine Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            CSV ingestion, automated column detection, manual mapping schema, and native SQL query execution
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCustomDataset ? (
            <button
              onClick={onResetToSampleData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Synthetic Dataset</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 font-mono">Sample: 1,250 retail records</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium w-fit">
        <button
          onClick={() => setActiveTab('sql')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'sql' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          SQL Query Studio &amp; Predefined Queries
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Upload CSV &amp; Column Mapping
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'schema' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Database Table Schema &amp; DDL
        </button>
      </div>

      {/* TAB 1: SQL STUDIO */}
      {activeTab === 'sql' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Predefined Query Library (1 col) */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Predefined Analytical Queries</h3>
              <p className="text-xs text-slate-500">12 executable enterprise queries with window functions &amp; CTEs</p>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {PREDEFINED_QUERIES.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleSelectPredefined(q)}
                  className={`w-full text-left p-2.5 rounded-md border text-xs transition-colors ${
                    selectedPredefinedId === q.id
                      ? 'border-blue-500 bg-blue-50/60 text-blue-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-semibold block truncate">{q.title}</span>
                  <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{q.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SQL Editor & Results (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">SQLite Query Editor</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-600 border border-slate-200">
                    Read-Only Protected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {sqlResult && (
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {sqlResult.executionTimeMs}ms · {sqlResult.rowCount} rows
                    </span>
                  )}
                  <button
                    onClick={() => handleRunSQL()}
                    disabled={sqlLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Query</span>
                  </button>
                </div>
              </div>

              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={7}
                className="w-full p-3 bg-slate-900 text-blue-300 font-mono text-xs rounded-md border border-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
                placeholder="SELECT * FROM transactions LIMIT 10;"
              />

              {sqlResult?.error && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-md text-rose-800 text-xs font-mono">
                  <strong>SQL Error: </strong> {sqlResult.error}
                </div>
              )}
            </div>

            {/* SQL Results Table */}
            {sqlResult && !sqlResult.error && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="p-3 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    Query Results ({sqlResult.rowCount} records returned)
                  </span>
                  <button
                    onClick={handleExportSQLCSV}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Results as CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200">
                      <tr>
                        {sqlResult.columns.map((col, idx) => (
                          <th key={idx} className="py-2 px-3 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {sqlResult.values.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {row.map((val, cIdx) => (
                            <td key={cIdx} className="py-1.5 px-3 whitespace-nowrap">
                              {val !== null ? String(val) : <span className="text-slate-400 italic">NULL</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CSV UPLOAD & COLUMN MAPPING */}
      {activeTab === 'upload' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Upload Transaction CSV Dataset</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any retail transaction CSV. RetailIQ automatically detects columns and provides a manual mapping interface.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg p-8 text-center transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 inline-block">
                Choose CSV File
              </span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
            <p className="text-[11px] text-slate-400 mt-2">Supports any standard retail dataset format with commas</p>
          </div>

          {uploadError && (
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-md text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Active Dataset Overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2">
            <div className="font-semibold text-slate-800">Currently Active Dataset:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block">Dataset Source:</span>
                <span className="text-slate-900 font-semibold">{datasetName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Rows:</span>
                <span className="text-slate-900 font-semibold">{transactions.length.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Mode:</span>
                <span className="text-slate-900 font-semibold">{isCustomDataset ? 'Custom CSV' : 'Demo Synthetic'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Actions:</span>
                <button
                  onClick={onResetToSampleData}
                  className="text-blue-600 hover:text-blue-700 font-sans font-medium"
                >
                  Reload 1,250 Record Sample
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Column Mapping Modal */}
      {mappingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Map Dataset Columns</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Map the detected CSV headers to RetailIQ analytical fields. Required fields are marked with an asterisk (*).
              </p>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-200 font-semibold text-slate-700">
                <span>RetailIQ Analytical Field</span>
                <span>Your CSV Column</span>
              </div>

              {CANONICAL_FIELDS.map((f) => (
                <div key={f.key} className="grid grid-cols-2 gap-4 items-center py-1">
                  <div>
                    <span className="font-medium text-slate-800">
                      {f.label} {f.required && <span className="text-rose-500">*</span>}
                    </span>
                    <span className="text-[11px] text-slate-400 block">{f.description}</span>
                  </div>

                  <select
                    value={columnMapping[f.key] || ''}
                    onChange={(e) =>
                      setColumnMapping({
                        ...columnMapping,
                        [f.key]: e.target.value,
                      })
                    }
                    className="p-2 border border-slate-200 rounded-md bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Do Not Map / Unavailable --</option>
                    {uploadedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setMappingModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMapping}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
              >
                Confirm Mapping &amp; Load Dataset ({uploadedRawRows.length} rows)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SCHEMA DDL */}
      {activeTab === 'schema' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Database Schema &amp; DDL Definition</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Normalized SQLite transactional schema utilized by the analytical engine
            </p>
          </div>

          <pre className="p-4 bg-slate-900 text-blue-300 font-mono text-xs rounded-lg border border-slate-800 overflow-x-auto leading-relaxed">
{`-- RetailIQ SQLite Production Schema
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    order_date TEXT NOT NULL, -- ISO-8601 YYYY-MM-DD
    customer_id TEXT,
    product_id TEXT,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    sales REAL NOT NULL,      -- Net gross line sales
    cost REAL NOT NULL,       -- Cost of goods sold
    profit REAL NOT NULL,     -- Realized line profit
    region TEXT,
    state TEXT,
    payment_method TEXT,
    discount REAL DEFAULT 0.0
);

-- Performance Indexes
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_date ON transactions(order_date);`}
          </pre>
        </div>
      )}
    </div>
  );
};
