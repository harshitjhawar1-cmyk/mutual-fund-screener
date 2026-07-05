import { NAVEntry, FundReturns, Fund } from '../types/fund';

function parseNavDate(s: string): Date {
  const [d, m, y] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function navBefore(data: NAVEntry[], target: Date): number | null {
  // data is newest-first; find last entry on or before target
  for (const e of data) {
    if (parseNavDate(e.date) <= target) return parseFloat(e.nav);
  }
  return null;
}

function cagr(start: number, end: number, years: number): number {
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

function absReturn(start: number, end: number): number {
  return ((end - start) / start) * 100;
}

function subMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() - n);
  return r;
}

function subYears(d: Date, n: number): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() - n);
  return r;
}

export interface ComputedMetrics {
  returns: FundReturns;
  xirr: number | undefined;
  cagr: number | undefined;
}

export function computeMetrics(data: NAVEntry[]): ComputedMetrics {
  if (!data || data.length < 2) {
    return { returns: {}, xirr: undefined, cagr: undefined };
  }

  const latest = parseFloat(data[0].nav);
  const latestDate = parseNavDate(data[0].date);

  const n6m  = navBefore(data, subMonths(latestDate, 6));
  const n1y  = navBefore(data, subYears(latestDate, 1));
  const n3y  = navBefore(data, subYears(latestDate, 3));
  const n5y  = navBefore(data, subYears(latestDate, 5));
  const n7y  = navBefore(data, subYears(latestDate, 7));
  const n10y = navBefore(data, subYears(latestDate, 10));

  const oldest = data[data.length - 1];
  const inceptionNAV = parseFloat(oldest.nav);
  const inceptionDate = parseNavDate(oldest.date);
  const inceptionYears =
    (latestDate.getTime() - inceptionDate.getTime()) / (365.25 * 86400 * 1000);

  return {
    returns: {
      sixMonth:  n6m  != null ? absReturn(n6m, latest)      : undefined,
      oneYear:   n1y  != null ? cagr(n1y, latest, 1)        : undefined,
      threeYear: n3y  != null ? cagr(n3y, latest, 3)        : undefined,
      fiveYear:  n5y  != null ? cagr(n5y, latest, 5)        : undefined,
      sevenYear: n7y  != null ? cagr(n7y, latest, 7)        : undefined,
      tenYear:   n10y != null ? cagr(n10y, latest, 10)      : undefined,
    },
    // 3Y lump sum XIRR equals 3Y CAGR for a single cash flow
    xirr: n3y != null ? cagr(n3y, latest, 3) : undefined,
    cagr: inceptionYears > 0.1 ? cagr(inceptionNAV, latest, inceptionYears) : undefined,
  };
}

export interface RollingPoint {
  date: string;       // "YYYY-MM-DD" for recharts
  value: number;      // CAGR %
}

// Sample every ~91 days (quarterly) from the NAV history and compute trailing CAGR.
export function computeRollingReturns(data: NAVEntry[], rollYears: number): RollingPoint[] {
  if (!data || data.length < 2) return [];

  const QUARTER_DAYS = 91;
  const results: RollingPoint[] = [];
  let lastDate: Date | null = null;

  // data is newest-first; iterate to build quarterly samples
  for (const entry of data) {
    const endDate = parseNavDate(entry.date);

    if (lastDate !== null) {
      const gap = (lastDate.getTime() - endDate.getTime()) / 86400000;
      if (gap < QUARTER_DAYS) continue;
    }

    const startDate = subYears(endDate, rollYears);
    const startNAV = navBefore(data, startDate);
    if (startNAV === null) continue;

    const endNAV = parseFloat(entry.nav);
    results.push({
      date: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
      value: parseFloat(cagr(startNAV, endNAV, rollYears).toFixed(2)),
    });
    lastDate = endDate;
  }

  return results.reverse(); // oldest-first for chart
}

// NAV history sampled monthly for the price chart in the modal
export interface NavPoint {
  date: string;   // "YYYY-MM-DD"
  nav: number;
}

export function sampleNavHistory(data: NAVEntry[], intervalDays = 30): NavPoint[] {
  if (!data || data.length === 0) return [];
  const result: NavPoint[] = [];
  let lastDate: Date | null = null;
  for (const e of data) {
    const d = parseNavDate(e.date);
    if (lastDate !== null && (lastDate.getTime() - d.getTime()) / 86400000 < intervalDays) continue;
    result.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      nav: parseFloat(parseFloat(e.nav).toFixed(4)),
    });
    lastDate = d;
  }
  return result.reverse();
}

// Percentile rank of each fund's 3Y return within its category.
// Returns map: schemeCode → percentile (0–100), only for loaded funds with ≥5 category peers.
export function computePercentileRanks(funds: Fund[]): Map<number, number> {
  // Group sorted 3Y values by category
  const byCategory = new Map<string, number[]>();
  for (const f of funds) {
    if (f.status === 'loaded' && f.category && f.returns?.threeYear !== undefined) {
      const arr = byCategory.get(f.category) ?? [];
      arr.push(f.returns.threeYear);
      byCategory.set(f.category, arr);
    }
  }
  for (const [cat, arr] of byCategory) {
    byCategory.set(cat, arr.slice().sort((a, b) => a - b));
  }

  const result = new Map<number, number>();
  for (const f of funds) {
    if (f.status !== 'loaded' || !f.category || f.returns?.threeYear === undefined) continue;
    const arr = byCategory.get(f.category)!;
    if (arr.length < 5) continue; // not enough peers
    const val = f.returns.threeYear;
    // Binary search: count of values strictly less than val
    let lo = 0, hi = arr.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < val) lo = mid + 1; else hi = mid; }
    result.set(f.schemeCode, Math.round((lo / arr.length) * 100));
  }
  return result;
}

export function fmt(value: number | undefined, suffix = '%', decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}${suffix}`;
}

export function fmtNav(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) return '—';
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}
