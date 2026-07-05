import { CASData } from '../types/holding';

interface HoldingsPanelProps {
  cas: CASData;
}

function fmt(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function pct(a: number, b: number) {
  if (!b) return '—';
  return ((a / b - 1) * 100).toFixed(2) + '%';
}

export function HoldingsPanel({ cas }: HoldingsPanelProps) {
  const gain = cas.totalMarketValue - cas.totalCost;
  const gainPct = cas.totalCost ? (gain / cas.totalCost) * 100 : 0;
  const isProfit = gain >= 0;

  return (
    <div className="border-b border-surface-border bg-surface-hover/40 px-4 py-3">
      <div className="max-w-[1600px] mx-auto">
        {/* Summary row */}
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted uppercase tracking-wider font-semibold">My Portfolio</span>
            {cas.investorName && (
              <span className="text-xs text-muted/60">· {cas.investorName}</span>
            )}
            {cas.pan && (
              <span className="text-xs text-muted/40 font-mono">{cas.pan}</span>
            )}
          </div>
          <div className="ml-auto flex flex-wrap gap-6 text-sm">
            {cas.totalCost > 0 && (
              <div className="text-center">
                <div className="text-xs text-muted mb-0.5">Invested</div>
                <div className="font-semibold text-white tabular-nums">{fmt(cas.totalCost)}</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-xs text-muted mb-0.5">Current</div>
              <div className="font-semibold text-white tabular-nums">{fmt(cas.totalMarketValue)}</div>
            </div>
            {cas.totalCost > 0 && (
              <div className="text-center">
                <div className="text-xs text-muted mb-0.5">Gain / Loss</div>
                <div className={`font-semibold tabular-nums ${isProfit ? 'text-positive' : 'text-negative'}`}>
                  {isProfit ? '+' : ''}{fmt(gain)}{' '}
                  <span className="text-xs">({isProfit ? '+' : ''}{gainPct.toFixed(2)}%)</span>
                </div>
              </div>
            )}
            <div className="text-center">
              <div className="text-xs text-muted mb-0.5">Funds</div>
              <div className="font-semibold text-white">{cas.holdings.length}</div>
            </div>
          </div>
        </div>

        {/* Holdings chips */}
        <div className="flex flex-wrap gap-2">
          {cas.holdings.map((h, i) => {
            const holdingGain = h.costValue > 0 ? ((h.marketValue / h.costValue) - 1) * 100 : null;
            const isPos = holdingGain !== null ? holdingGain >= 0 : null;
            // Shorten scheme name: take first meaningful words
            const shortName = h.schemeName
              .replace(/\b(Direct Plan|Regular Plan|Growth Option|Growth|IDCW|Dividend|Reinvestment)\b/gi, '')
              .replace(/\s{2,}/g, ' ')
              .trim()
              .split(' ').slice(0, 5).join(' ');

            return (
              <div
                key={i}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface border border-surface-border text-xs"
                title={h.schemeName}
              >
                <div>
                  <span className="text-white font-medium">{shortName}</span>
                  <span className="text-muted ml-1 font-mono">{h.units.toFixed(3)} u</span>
                </div>
                <div className="text-muted/60">·</div>
                <div className="font-medium tabular-nums text-white">{fmt(h.marketValue)}</div>
                {holdingGain !== null && (
                  <div className={`text-[11px] tabular-nums font-semibold ${isPos ? 'text-positive' : 'text-negative'}`}>
                    {isPos ? '+' : ''}{holdingGain.toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
