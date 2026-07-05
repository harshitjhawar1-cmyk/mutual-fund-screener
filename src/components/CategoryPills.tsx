interface CategoryPillsProps {
  categories: string[];       // exact AMFI categories that have loaded
  selected: string;           // '' | '__bucket__X' | exact AMFI category string
  onChange: (value: string) => void;
}

// Top-level bucket definitions
const BUCKETS = [
  { label: 'All',         key: '' },
  { label: 'Equity',      key: 'Equity' },
  { label: 'Debt',        key: 'Debt' },
  { label: 'Hybrid',      key: 'Hybrid' },
  { label: 'Index / ETF', key: 'Index' },
  { label: 'Solution',    key: 'Solution' },
  { label: 'Other',       key: 'Other' },
];

export function bucketFor(category: string): string {
  const u = category.toUpperCase();
  if (u.includes('EQUITY') || u.includes('ELSS')) return 'Equity';
  if (
    u.includes('DEBT') || u.includes('LIQUID') || u.includes('MONEY MARKET') ||
    u.includes('GILT') || u.includes('CREDIT') || u.includes('DURATION') ||
    u.includes('BANKING AND PSU') || u.includes('CORPORATE BOND') ||
    u.includes('FLOATER') || u.includes('OVERNIGHT') || u.includes('FIXED MATURITY')
  ) return 'Debt';
  if (u.includes('HYBRID') || u.includes('ARBITRAGE') || u.includes('MULTI ASSET')) return 'Hybrid';
  if (u.includes('INDEX') || u.includes('ETF') || u.includes('FUND OF FUND')) return 'Index';
  if (u.includes('SOLUTION') || u.includes('RETIREMENT') || u.includes('CHILDREN')) return 'Solution';
  return 'Other';
}

function activeBucketFrom(selected: string): string {
  if (!selected) return '';
  if (selected.startsWith('__bucket__')) return selected.replace('__bucket__', '');
  return bucketFor(selected);
}

export function CategoryPills({ categories, selected, onChange }: CategoryPillsProps) {
  const activeBucket = activeBucketFrom(selected);

  // Sub-categories = exact AMFI categories belonging to the active bucket
  const subCategories = activeBucket
    ? categories
        .filter(c => bucketFor(c) === activeBucket)
        .sort()
    : [];

  // Strip the AMFI scheme-type prefix so labels are readable
  // e.g. "Equity Scheme - Large Cap Fund" → "Large Cap Fund"
  function shortLabel(cat: string): string {
    const parts = cat.split(' - ');
    return parts.length > 1 ? parts.slice(1).join(' - ') : cat;
  }

  function handleBucketClick(key: string) {
    if (key === '') { onChange(''); return; }
    // If already on this bucket (or a sub-cat inside it), toggle off
    if (activeBucket === key) { onChange(''); return; }
    onChange(`__bucket__${key}`);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Top-level bucket pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {BUCKETS.map(b => {
          const count = b.key === ''
            ? categories.length
            : categories.filter(c => bucketFor(c) === b.key).length;
          if (b.key !== '' && count === 0) return null;
          const isActive = activeBucket === b.key;
          return (
            <button
              key={b.key}
              onClick={() => handleBucketClick(b.key)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : 'bg-surface-hover text-muted hover:text-gray-200'
              }`}
            >
              {b.label}
              {b.key !== '' && count > 0 && (
                <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-muted/50'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-category pills — only shown when a bucket is active */}
      {subCategories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {/* "All <bucket>" pill to clear sub-selection */}
          <button
            onClick={() => onChange(`__bucket__${activeBucket}`)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
              selected.startsWith('__bucket__')
                ? 'bg-accent/30 text-accent border border-accent/40'
                : 'bg-transparent text-muted/50 border border-surface-border hover:text-muted'
            }`}
          >
            All {BUCKETS.find(b => b.key === activeBucket)?.label}
          </button>

          {subCategories.map(cat => {
            const isActive = selected === cat;
            return (
              <button
                key={cat}
                onClick={() => onChange(isActive ? `__bucket__${activeBucket}` : cat)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'bg-surface-card text-muted border border-surface-border hover:text-gray-200 hover:border-accent/40'
                }`}
              >
                {shortLabel(cat)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
