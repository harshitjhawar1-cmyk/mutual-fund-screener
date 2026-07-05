import { useState, useCallback, useRef, useMemo } from 'react';
import { Fund, FundListItem, FilterState, PlanType } from '../types/fund';
import { fetchAllFunds, fetchFundDetailWithRetry } from '../services/mfApi';
import { computeMetrics, computePercentileRanks } from '../utils/calculations';

const CONCURRENCY = 20;
const FLUSH_INTERVAL_MS = 400;

function detectPlan(name: string): PlanType {
  const u = name.toUpperCase();
  if (u.includes('DIRECT')) return 'Direct';
  if (u.includes('REGULAR')) return 'Regular';
  return 'Unknown';
}

export interface UpdateProgress {
  loaded: number;
  total: number;
  active: boolean;
}

export function useFunds() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress>({ loaded: 0, total: 0, active: false });
  const [filters, setFilters] = useState<FilterState>({
    category: '', planType: '', fundHouse: '', schemeType: '', search: '',
  });

  const pendingRef = useRef<Map<number, Partial<Fund>>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fundsRef = useRef<Fund[]>([]);
  const inFlightRef = useRef<Set<number>>(new Set());
  // Raw NAV history cache for rolling-returns modal
  const navCacheRef = useRef<Map<number, import('../types/fund').NAVEntry[]>>(new Map());

  function startFlushTimer() {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setInterval(() => {
      const pending = pendingRef.current;
      if (pending.size === 0) return;
      const snapshot = new Map(pending);
      pending.clear();
      setFunds(prev => {
        const next = prev.map(f => {
          const u = snapshot.get(f.schemeCode);
          return u ? { ...f, ...u } : f;
        });
        fundsRef.current = next;
        return next;
      });
    }, FLUSH_INTERVAL_MS);
  }

  function stopFlushTimer() {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending.size > 0) {
      const snapshot = new Map(pending);
      pending.clear();
      setFunds(prev => {
        const next = prev.map(f => {
          const u = snapshot.get(f.schemeCode);
          return u ? { ...f, ...u } : f;
        });
        fundsRef.current = next;
        return next;
      });
    }
  }

  // Shared batch worker — runs over the given codes array with concurrency limiting.
  // Does not reset existing data; skips already-loaded funds.
  async function runBatch(
    codes: number[],
    signal: AbortSignal,
    initialLoaded: number,
    total: number,
  ) {
    let idx = 0;
    let loaded = initialLoaded;

    startFlushTimer();

    const worker = async () => {
      while (idx < codes.length && !signal.aborted) {
        const code = codes[idx++];
        inFlightRef.current.add(code);
        pendingRef.current.set(code, { status: 'loading' });
        try {
          const res = await fetchFundDetailWithRetry(code, signal);
          if (signal.aborted) break;
          const { returns, xirr, cagr } = computeMetrics(res.data);
          navCacheRef.current.set(code, res.data);
          pendingRef.current.set(code, {
            status: 'loaded',
            fundHouse: res.meta.fund_house,
            category: res.meta.scheme_category,
            currentNAV: res.data[0] ? parseFloat(res.data[0].nav) : undefined,
            navDate: res.data[0]?.date,
            returns,
            xirr,
            cagr,
          });
        } catch {
          if (!signal.aborted) pendingRef.current.set(code, { status: 'error' });
        }
        inFlightRef.current.delete(code);
        loaded++;
        if (loaded % 20 === 0) setProgress({ loaded, total, active: true });
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    stopFlushTimer();
    setProgress({ loaded, total, active: false });
  }

  const loadFundList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const list: FundListItem[] = await fetchAllFunds();
      const initial: Fund[] = list.map(item => ({
        schemeCode: item.schemeCode,
        schemeName: item.schemeName,
        planType: detectPlan(item.schemeName),
        status: 'idle',
      }));
      fundsRef.current = initial;
      setFunds(initial);
    } catch (err) {
      console.error('Failed to load fund list:', err);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Lazy-load a single visible row. Skips if batch is already fetching it.
  const loadSingleFund = useCallback(async (schemeCode: number) => {
    const already = fundsRef.current.find(f => f.schemeCode === schemeCode);
    if (!already || already.status === 'loaded' || already.status === 'loading') return;
    if (inFlightRef.current.has(schemeCode)) return;

    inFlightRef.current.add(schemeCode);
    pendingRef.current.set(schemeCode, { status: 'loading' });
    startFlushTimer();

    try {
      const res = await fetchFundDetailWithRetry(schemeCode);
      const { returns, xirr, cagr } = computeMetrics(res.data);
      navCacheRef.current.set(schemeCode, res.data);
      pendingRef.current.set(schemeCode, {
        status: 'loaded',
        fundHouse: res.meta.fund_house,
        category: res.meta.scheme_category,
        currentNAV: res.data[0] ? parseFloat(res.data[0].nav) : undefined,
        navDate: res.data[0]?.date,
        returns,
        xirr,
        cagr,
      });
    } catch {
      pendingRef.current.set(schemeCode, { status: 'error' });
    } finally {
      inFlightRef.current.delete(schemeCode);
    }
  }, []);

  // Fetch NAV history for modal (also loads fund metrics if not already loaded)
  const fetchNavForModal = useCallback(async (schemeCode: number) => {
    if (navCacheRef.current.has(schemeCode)) {
      return navCacheRef.current.get(schemeCode)!;
    }
    const res = await fetchFundDetailWithRetry(schemeCode);
    navCacheRef.current.set(schemeCode, res.data);
    return res.data;
  }, []);

  const getNavHistory = useCallback((schemeCode: number) => {
    return navCacheRef.current.get(schemeCode) ?? null;
  }, []);

  // "Update Now" button — resets everything and reloads all funds.
  const updateAll = useCallback(async () => {
    if (progress.active) {
      abortRef.current?.abort();
      return;
    }

    setFunds(prev => {
      const next = prev.map(f => ({
        ...f,
        status: 'idle' as const,
        currentNAV: undefined,
        navDate: undefined,
        returns: undefined,
        xirr: undefined,
        cagr: undefined,
        fundHouse: undefined,
        category: undefined,
      }));
      fundsRef.current = next;
      return next;
    });

    const codes = fundsRef.current.map(f => f.schemeCode);
    setProgress({ loaded: 0, total: codes.length, active: true });
    abortRef.current = new AbortController();
    await runBatch(codes, abortRef.current.signal, 0, codes.length);
  }, [progress.active]);

  // Triggered when user sorts by a returns column — loads all remaining unloaded funds
  // without discarding data that's already been fetched.
  const loadAllForSort = useCallback(async () => {
    if (progress.active) return; // batch already running

    const all = fundsRef.current;
    const alreadyLoaded = all.filter(f => f.status === 'loaded').length;
    const pending = all
      .filter(f => f.status === 'idle' || f.status === 'error')
      .map(f => f.schemeCode);

    if (pending.length === 0) return;

    const total = all.length;
    setProgress({ loaded: alreadyLoaded, total, active: true });
    abortRef.current = new AbortController();
    await runBatch(pending, abortRef.current.signal, alreadyLoaded, total);
  }, [progress.active]);

  // Derived filter options
  const loadedFunds = funds.filter(f => f.status === 'loaded');
  const categories = [...new Set(loadedFunds.map(f => f.category).filter(Boolean) as string[])].sort();
  const fundHouses = [...new Set(loadedFunds.map(f => f.fundHouse).filter(Boolean) as string[])].sort();

  const filteredFunds = funds.filter(f => {
    if (filters.search && !f.schemeName.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.planType && f.planType !== filters.planType) return false;
    if (filters.category && f.category !== filters.category) return false;
    if (filters.fundHouse && f.fundHouse !== filters.fundHouse) return false;
    if (filters.schemeType) {
      const u = f.schemeName.toUpperCase();
      if (filters.schemeType === 'Open Ended Schemes' && !u.includes('OPEN ENDED') && f.status !== 'idle') return false;
      if (filters.schemeType === 'Close Ended Schemes' && !u.includes('CLOSE ENDED') && f.status !== 'idle') return false;
      if (filters.schemeType === 'Interval Fund Schemes' && !u.includes('INTERVAL') && f.status !== 'idle') return false;
    }
    return true;
  });

  // Percentile ranks, recomputed each flush cycle (every 400ms during batch load)
  const percentileMap = useMemo(() => computePercentileRanks(funds), [funds]);

  return {
    funds,
    filteredFunds,
    percentileMap,
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
    getNavHistory,
  };
}
