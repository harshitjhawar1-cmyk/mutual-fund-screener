import { useEffect, useCallback, useState, lazy, Suspense } from 'react';
import { useFunds } from './hooks/useFunds';
import { Header } from './components/Header';
import { Filters } from './components/Filters';
import { SearchBar } from './components/SearchBar';
import { FundTable } from './components/FundTable';
import { CategoryPills, bucketFor } from './components/CategoryPills';
import { Fund } from './types/fund';

const FundDetailModal = lazy(() =>
  import('./components/FundDetailModal').then(m => ({ default: m.FundDetailModal }))
);

export default function App() {
  const {
    funds,
    filteredFunds,
    isLoadingList,
    progress,
    filters,
    setFilters,
    categories,
    fundHouses,
    loadFundList,
    loadSingleFund,
    loadAllForSort,
    updateAll,
    fetchNavForModal,
    percentileMap,
  } = useFunds();

  const [activePill, setActivePill] = useState('');
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);

  useEffect(() => {
    loadFundList();
  }, [loadFundList]);

  const handleRowVisible = useCallback(
    (schemeCode: number) => loadSingleFund(schemeCode),
    [loadSingleFund],
  );

  const handleFundClick = useCallback((fund: Fund) => {
    setSelectedFund(fund);
  }, []);

  // Three filter states: '' = all, '__bucket__X' = broad, exact string = sub-category.
  // Unloaded funds stay visible while batch runs — drop out once loaded if they don't match.
  const visibleFunds = (() => {
    if (!activePill) return filteredFunds;
    if (activePill.startsWith('__bucket__')) {
      const bucket = activePill.replace('__bucket__', '');
      return filteredFunds.filter(f => !f.category || bucketFor(f.category) === bucket);
    }
    return filteredFunds.filter(f => !f.category || f.category === activePill);
  })();

  return (
    <div className="flex flex-col h-dvh bg-surface">
      <Header
        progress={progress}
        totalFunds={funds.length}
        filteredCount={visibleFunds.length}
        onUpdate={updateAll}
      />

      <Filters
        filters={filters}
        categories={categories}
        fundHouses={fundHouses}
        totalFunds={funds.length}
        filteredCount={visibleFunds.length}
        onChange={f => { setFilters(f); setActivePill(''); }}
      />

      {/* Search + category pills */}
      <div className="px-4 py-2 bg-surface border-b border-surface-border w-full flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchBar
          value={filters.search}
          onChange={v => setFilters({ ...filters, search: v })}
        />
        {isLoadingList && (
          <span className="flex items-center gap-2 text-xs text-muted shrink-0">
            <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Loading fund list…
          </span>
        )}
        <div className="sm:ml-auto">
          <CategoryPills
            categories={categories}
            selected={activePill}
            onChange={pill => {
              setActivePill(pill);
              if (pill !== '') loadAllForSort();
            }}
          />
        </div>
      </div>

      {/* Table */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden w-full">
        {isLoadingList && funds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
            <span className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Fetching fund list from AMFI…</p>
          </div>
        ) : (
          <FundTable
            funds={visibleFunds}
            percentileMap={percentileMap}
            onRowVisible={handleRowVisible}
            onSortByReturns={loadAllForSort}
            onFundClick={handleFundClick}
          />
        )}
      </main>

      <footer className="border-t border-surface-border px-4 py-1.5 text-[11px] text-muted/60 flex items-center justify-between flex-wrap gap-2">
        <span>Data sourced from mfapi.in · AMFI India. NAV updates after 9 PM IST.</span>
        <span>XIRR (3Y) = lump sum ≡ 3Y CAGR · Expense ratio not available via free APIs</span>
      </footer>

      {selectedFund && (
        <Suspense fallback={null}>
          <FundDetailModal
            fund={selectedFund}
            onClose={() => setSelectedFund(null)}
            fetchNav={fetchNavForModal}
          />
        </Suspense>
      )}
    </div>
  );
}
