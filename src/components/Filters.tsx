import { FilterState } from '../types/fund';

interface FiltersProps {
  filters: FilterState;
  categories: string[];
  fundHouses: string[];
  totalFunds: number;
  filteredCount: number;
  onChange: (filters: FilterState) => void;
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-[10px] font-medium text-muted uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-surface-card border border-surface-border rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-accent transition-colors cursor-pointer min-w-[140px] max-w-[240px]"
      >
        <option value="">All</option>
        {options.map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Filters({ filters, categories, fundHouses, filteredCount, totalFunds, onChange }: FiltersProps) {
  const hasFilters = filters.category || filters.planType || filters.fundHouse || filters.schemeType;

  return (
    <div className="bg-surface-card border-b border-surface-border px-4 py-3">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Category"
            value={filters.category}
            options={categories}
            onChange={v => onChange({ ...filters, category: v })}
          />

          <Select
            label="Plan Type"
            value={filters.planType}
            options={['Direct', 'Regular']}
            onChange={v => onChange({ ...filters, planType: v })}
          />

          <Select
            label="Fund House (AMC)"
            value={filters.fundHouse}
            options={fundHouses}
            onChange={v => onChange({ ...filters, fundHouse: v })}
          />

          <Select
            label="Scheme Type"
            value={filters.schemeType}
            options={['Open Ended Schemes', 'Close Ended Schemes', 'Interval Fund Schemes']}
            onChange={v => onChange({ ...filters, schemeType: v })}
          />

          {hasFilters && (
            <button
              onClick={() => onChange({ category: '', planType: '', fundHouse: '', schemeType: '', search: filters.search })}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted hover:text-white border border-surface-border hover:border-surface-hover rounded-lg transition-colors self-end"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}

          <div className="ml-auto self-end text-xs text-muted">
            {filteredCount < totalFunds ? (
              <span>
                <span className="text-white font-medium">{filteredCount.toLocaleString()}</span>
                {' '}of {totalFunds.toLocaleString()} funds
              </span>
            ) : (
              <span><span className="text-white font-medium">{totalFunds.toLocaleString()}</span> funds</span>
            )}
            {categories.length > 0 && (
              <span className="ml-2 text-muted/60">· {categories.length} categories loaded</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
