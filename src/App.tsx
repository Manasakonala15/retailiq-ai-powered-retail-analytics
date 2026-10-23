/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Sidebar, NavigationPage } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalFilterBar } from './components/common/GlobalFilterBar';
import { ExecutiveOverview } from './pages/ExecutiveOverview';
import { SalesAnalytics } from './pages/SalesAnalytics';
import { CustomerIntelligence } from './pages/CustomerIntelligence';
import { ProductPerformance } from './pages/ProductPerformance';
import { RegionalAnalytics } from './pages/RegionalAnalytics';
import { ExploratoryDataAnalysis } from './pages/ExploratoryDataAnalysis';
import { DataQuality } from './pages/DataQuality';
import { AIBusinessInsights } from './pages/AIBusinessInsights';
import { DataManagement } from './pages/DataManagement';

import { generateSyntheticTransactions, transactionsToCSV } from './data/sampleDataset';
import {
  calculateExecutiveKPIs,
  filterTransactions,
} from './services/dataProcessor';
import { GlobalFilters, Transaction } from './types/retail';

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('overview');

  // Datasets state
  const initialSynthetic = useMemo(() => generateSyntheticTransactions(1250), []);
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>(initialSynthetic);
  const [cleanedTransactions, setCleanedTransactions] = useState<Transaction[] | null>(null);
  const [isCustomDataset, setIsCustomDataset] = useState<boolean>(false);
  const [datasetName, setDatasetName] = useState<string>(
    'Demonstration Retail Dataset (1,250 Records)'
  );
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);

  // Active dataset is either cleaned or raw
  const activeTransactions = cleanedTransactions || rawTransactions;
  const isCleaned = cleanedTransactions !== null;

  // Global filters
  const [filters, setFilters] = useState<GlobalFilters>({
    dateRange: { start: '', end: '' },
    category: 'all',
    product: 'all',
    region: 'all',
    rfmSegment: 'all',
    searchQuery: '',
  });

  // Calculate available date bounds and unique dimensions
  const { availableDateRange, availableCategories, availableRegions } = useMemo(() => {
    const dates = activeTransactions.map((t) => t.orderDate).filter(Boolean).sort();
    const minDate = dates[0] || '';
    const maxDate = dates[dates.length - 1] || '';
    const cats = Array.from(new Set(activeTransactions.map((t) => t.category).filter(Boolean))).sort();
    const regs = Array.from(new Set(activeTransactions.map((t) => t.region).filter((r) => r && r !== 'Standard'))).sort();
    return {
      availableDateRange: { min: minDate, max: maxDate },
      availableCategories: cats,
      availableRegions: regs,
    };
  }, [activeTransactions]);

  // Filtered dataset
  const filteredTransactions = useMemo(() => {
    return filterTransactions(activeTransactions, filters);
  }, [activeTransactions, filters]);

  // Executive KPIs
  const kpis = useMemo(() => {
    return calculateExecutiveKPIs(filteredTransactions);
  }, [filteredTransactions]);

  // Handlers for dataset operations
  const handleUploadDataset = (newTransactions: Transaction[], filename: string, headers: string[]) => {
    setRawTransactions(newTransactions);
    setCleanedTransactions(null); // Reset cleaning on new upload
    setIsCustomDataset(true);
    setDatasetName(filename);
    setRawHeaders(headers);
    // Reset filters
    setFilters({
      dateRange: { start: '', end: '' },
      category: 'all',
      product: 'all',
      region: 'all',
      rfmSegment: 'all',
      searchQuery: '',
    });
    setCurrentPage('quality'); // Take user to quality audit after upload
  };

  const handleResetToSampleData = () => {
    const freshSample = generateSyntheticTransactions(1250);
    setRawTransactions(freshSample);
    setCleanedTransactions(null);
    setIsCustomDataset(false);
    setDatasetName('Demonstration Retail Dataset (1,250 Records)');
    setRawHeaders([]);
    setFilters({
      dateRange: { start: '', end: '' },
      category: 'all',
      product: 'all',
      region: 'all',
      rfmSegment: 'all',
      searchQuery: '',
    });
  };

  const handleApplyCleanedData = (cleaned: Transaction[]) => {
    setCleanedTransactions(cleaned);
  };

  const handleRestoreOriginal = () => {
    setCleanedTransactions(null);
  };

  // CSV Exports
  const handleExportCSV = (type: 'original' | 'cleaned' | 'filtered') => {
    const target =
      type === 'original'
        ? rawTransactions
        : type === 'cleaned'
        ? cleanedTransactions || rawTransactions
        : filteredTransactions;

    const csvStr = transactionsToCSV(target);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `retailiq_${type}_export_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Markdown Summary Report Download
  const handleExportReport = () => {
    const lines = [
      '# RetailIQ — Executive Retail Analytics Intelligence Report',
      `*Generated on: ${new Date().toISOString()}*`,
      `*Dataset: ${datasetName} (${filteredTransactions.length} records in active scope)*`,
      '',
      '---',
      '',
      '## 1. Executive Performance Summary',
      `- **Total Revenue**: $${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `- **Total Gross Profit**: $${kpis.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `- **Profit Margin**: ${kpis.profitMargin}%`,
      `- **Total Orders**: ${kpis.totalOrders.toLocaleString()}`,
      `- **Total Units Sold**: ${kpis.totalUnitsSold.toLocaleString()}`,
      `- **Average Order Value (AOV)**: $${kpis.averageOrderValue.toFixed(2)}`,
      `- **Active Customer Accounts**: ${kpis.uniqueCustomers.toLocaleString()}`,
      `- **Average Spend per Customer**: $${kpis.averageCustomerSpending.toFixed(2)}`,
      '',
      '## 2. Active Dimensional Filters',
      `- **Date Range**: ${filters.dateRange.start || 'Unbounded'} to ${filters.dateRange.end || 'Unbounded'}`,
      `- **Category Filter**: ${filters.category}`,
      `- **Region Filter**: ${filters.region}`,
      `- **Search Query**: ${filters.searchQuery || 'None'}`,
      '',
      '## 3. Data Hygiene & Governance',
      `- **Cleaning Status**: ${isCleaned ? 'Cleaned & Deduplicated' : 'Raw Original'}`,
      `- **Total Raw Records**: ${rawTransactions.length.toLocaleString()}`,
      '',
      '---',
      '*RetailIQ Decision Intelligence Platform — Built for Big Data Analytics*',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `retailiq_executive_report_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        datasetName={datasetName}
        totalRecords={filteredTransactions.length}
        onResetToSampleData={handleResetToSampleData}
        isCustomDataset={isCustomDataset}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentPage={currentPage}
          onExportCSV={handleExportCSV}
          onExportReport={handleExportReport}
          recordCount={filteredTransactions.length}
        />

        {/* Global Multi-dimensional Filter Bar */}
        <GlobalFilterBar
          filters={filters}
          onChangeFilters={setFilters}
          categories={availableCategories}
          regions={availableRegions}
          availableDateRange={availableDateRange}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {currentPage === 'overview' && (
              <ExecutiveOverview transactions={filteredTransactions} kpis={kpis} />
            )}

            {currentPage === 'sales' && (
              <SalesAnalytics transactions={filteredTransactions} />
            )}

            {currentPage === 'customers' && (
              <CustomerIntelligence transactions={filteredTransactions} />
            )}

            {currentPage === 'products' && (
              <ProductPerformance transactions={filteredTransactions} />
            )}

            {currentPage === 'regional' && (
              <RegionalAnalytics transactions={filteredTransactions} />
            )}

            {currentPage === 'eda' && (
              <ExploratoryDataAnalysis transactions={filteredTransactions} />
            )}

            {currentPage === 'quality' && (
              <DataQuality
                originalTransactions={rawTransactions}
                activeTransactions={activeTransactions}
                onApplyCleanedData={handleApplyCleanedData}
                onRestoreOriginal={handleRestoreOriginal}
                rawHeaders={rawHeaders}
                isCleaned={isCleaned}
              />
            )}

            {currentPage === 'ai-insights' && (
              <AIBusinessInsights transactions={filteredTransactions} />
            )}

            {currentPage === 'data-management' && (
              <DataManagement
                transactions={activeTransactions}
                onUploadDataset={handleUploadDataset}
                onResetToSampleData={handleResetToSampleData}
                isCustomDataset={isCustomDataset}
                datasetName={datasetName}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
