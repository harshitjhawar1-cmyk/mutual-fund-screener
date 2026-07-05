import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  LineChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Fund, NAVEntry } from '../types/fund';
import {
  computeRollingReturns,
  sampleNavHistory,
  RollingPoint,
  NavPoint,
  fmt,
  fmtNav,
} from '../utils/calculations';

const ROLL_PERIODS = [
  { label: '1Y Rolling', years: 1 },
  { label: '3Y Rolling', years: 3 },
  { label: '5Y Rolling', years: 5 },
];

type TabId = 'rolling' | 'nav';

function StatCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const color =
    positive === undefined ? 'text-gray-200' : positive ? 'text-positive' : 'text-negative';
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <span className="text-[10px] text-muted uppercase tracking-wide whitespace-nowrap">{label}</span>
      <span className={`text-sm font-semibold num ${color}`}>{value}</span>
    </div>
  );
}

function ReturnTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted mb-1">{label}</p>
      <p className={`font-semibold num ${val >= 0 ? 'text-positive' : 'text-negative'}`}>{fmt(val)}</p>
    </div>
  );
}

function NavTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted mb-1">{label}</p>
      <p className="font-semibold num text-accent">{fmtNav(payload[0].value)}</p>
    </div>
  );
}

function formatAxisDate(d: string): string {
  const [y, m] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

interface FundDetailModalProps {
  fund: Fund;
  onClose: () => void;
  fetchNav: (schemeCode: number) => Promise<NAVEntry[]>;
}

export function FundDetailModal({ fund, onClose, fetchNav }: FundDetailModalProps) {
  const [navData, setNavData] = useState<NAVEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('rolling');
  const [activePeriod, setActivePeriod] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNav(fund.schemeCode)
      .then(data => { if (!cancelled) { setNavData(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fund.schemeCode, fetchNav]);

  const rollingData: RollingPoint[] = navData ? computeRollingReturns(navData, activePeriod) : [];
  const navHistory: NavPoint[] = navData ? sampleNavHistory(navData, 30) : [];

  const values = rollingData.map(d => d.value);
  const rollingMin = values.length ? Math.min(...values) : undefined;
  const rollingMax = values.length ? Math.max(...values) : undefined;
  const rollingAvg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
  const rollingPositivePct = values.length
    ? (values.filter(v => v >= 0).length / values.length) * 100
    : undefined;

  const yMin = rollingMin !== undefined ? Math.floor(rollingMin - 2) : -10;
  const yMax = rollingMax !== undefined ? Math.ceil(rollingMax + 2) : 30;
  // Percentage from top where y=0 sits, used for split gradient
  const zeroPct =
    yMax <= 0 ? 0 : yMin >= 0 ? 100 : Math.round((yMax / (yMax - yMin)) * 100);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
    [onClose],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface-card border border-surface-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[92dvh] flex flex-col shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-surface-border">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted mb-0.5">{fund.fundHouse ?? '—'}</p>
            <h2 className="text-sm font-semibold text-white leading-snug">{fund.schemeName}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {fund.category && (
                <span className="text-[11px] text-muted bg-surface-hover px-2 py-0.5 rounded-full">
                  {fund.category}
                </span>
              )}
              {fund.planType !== 'Unknown' && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  fund.planType === 'Direct' ? 'bg-accent/20 text-accent' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {fund.planType}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-hover shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick stats strip */}
        <div className="px-5 py-3 border-b border-surface-border flex gap-5 overflow-x-auto no-scrollbar">
          <StatCard label="NAV" value={fmtNav(fund.currentNAV)} />
          <StatCard label="6M"          value={fmt(fund.returns?.sixMonth)}  positive={(fund.returns?.sixMonth  ?? 0) >= 0} />
          <StatCard label="1Y"          value={fmt(fund.returns?.oneYear)}   positive={(fund.returns?.oneYear   ?? 0) >= 0} />
          <StatCard label="3Y"          value={fmt(fund.returns?.threeYear)} positive={(fund.returns?.threeYear ?? 0) >= 0} />
          <StatCard label="5Y"          value={fmt(fund.returns?.fiveYear)}  positive={(fund.returns?.fiveYear  ?? 0) >= 0} />
          <StatCard label="XIRR (3Y)"   value={fmt(fund.xirr)}              positive={(fund.xirr  ?? 0) >= 0} />
          <StatCard label="CAGR (Incep.)" value={fmt(fund.cagr)}            positive={(fund.cagr  ?? 0) >= 0} />
        </div>

        {/* Tab + period row */}
        <div className="flex items-center gap-1 px-5 pt-4 pb-2 flex-wrap gap-y-2">
          {/* Main tabs */}
          <div className="flex gap-1 mr-4">
            {(['rolling', 'nav'] as TabId[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab ? 'bg-accent text-white' : 'text-muted hover:text-gray-200 hover:bg-surface-hover'
                }`}
              >
                {tab === 'rolling' ? 'Rolling Returns' : 'NAV History'}
              </button>
            ))}
          </div>

          {/* Period sub-tabs (rolling only) */}
          {activeTab === 'rolling' && (
            <div className="flex gap-1">
              {ROLL_PERIODS.map(p => (
                <button
                  key={p.years}
                  onClick={() => setActivePeriod(p.years)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activePeriod === p.years
                      ? 'bg-surface-hover text-white border border-surface-border'
                      : 'text-muted hover:text-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <span className="ml-auto text-[11px] text-muted">
            {activeTab === 'rolling' && rollingData.length > 0 && `${rollingData.length} quarters`}
            {activeTab === 'nav' && navHistory.length > 0 && `${navHistory.length} monthly points`}
          </span>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0 px-5 pb-3 overflow-hidden" style={{ height: 240 }}>
          {loading ? (
            <div className="flex items-center justify-center h-full gap-2 text-muted">
              <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading NAV history…</span>
            </div>
          ) : activeTab === 'rolling' ? (
            rollingData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted text-sm">
                Not enough history for {activePeriod}Y rolling returns
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rollingData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="splitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"           stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset={`${zeroPct}%`} stopColor="#22c55e" stopOpacity={0.08} />
                      <stop offset={`${zeroPct}%`} stopColor="#ef4444" stopOpacity={0.08} />
                      <stop offset="100%"          stopColor="#ef4444" stopOpacity={0.25} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false}
                    axisLine={false} minTickGap={60} tickFormatter={formatAxisDate} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false}
                    domain={[yMin, yMax]} tickFormatter={v => `${v}%`} width={42} />
                  <Tooltip content={<ReturnTooltip />} />
                  <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="value" stroke="#4f7cff" strokeWidth={1.5}
                    fill="url(#splitGrad)" dot={false} activeDot={{ r: 4, fill: '#4f7cff' }} />
                </AreaChart>
              </ResponsiveContainer>
            )
          ) : (
            navHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted text-sm">
                No NAV history available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={navHistory} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false}
                    axisLine={false} minTickGap={60} tickFormatter={formatAxisDate} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `₹${v}`} width={56} />
                  <Tooltip content={<NavTooltip />} />
                  <Line type="monotone" dataKey="nav" stroke="#4f7cff" strokeWidth={1.5}
                    dot={false} activeDot={{ r: 4, fill: '#4f7cff' }} />
                </LineChart>
              </ResponsiveContainer>
            )
          )}
        </div>

        {/* Rolling stats footer */}
        {activeTab === 'rolling' && rollingData.length > 0 && (
          <div className="px-5 py-3 border-t border-surface-border flex gap-6 overflow-x-auto no-scrollbar">
            <StatCard label="Min Return"            value={fmt(rollingMin)}             positive={(rollingMin  ?? 0) >= 0} />
            <StatCard label="Max Return"            value={fmt(rollingMax)}             positive={(rollingMax  ?? 0) >= 0} />
            <StatCard label="Avg Return"            value={fmt(rollingAvg)}             positive={(rollingAvg  ?? 0) >= 0} />
            <StatCard label="% Positive Quarters"  value={rollingPositivePct !== undefined ? `${rollingPositivePct.toFixed(0)}%` : '—'}
              positive={(rollingPositivePct ?? 0) >= 50} />
          </div>
        )}

        {/* NAV history footer */}
        {activeTab === 'nav' && navHistory.length > 0 && (
          <div className="px-5 py-3 border-t border-surface-border flex gap-6 overflow-x-auto no-scrollbar">
            <StatCard label="Inception NAV" value={fmtNav(navHistory[0]?.nav)} />
            <StatCard label="Current NAV"   value={fmtNav(navHistory[navHistory.length - 1]?.nav)} />
            <StatCard label="All-time High" value={fmtNav(Math.max(...navHistory.map(d => d.nav)))} />
            <StatCard label="Total Growth"
              value={navHistory[0] && navHistory[navHistory.length - 1]
                ? fmt(((navHistory[navHistory.length - 1].nav / navHistory[0].nav) - 1) * 100)
                : '—'}
              positive
            />
          </div>
        )}
      </div>
    </div>
  );
}
