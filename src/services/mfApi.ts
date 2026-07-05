import { FundListItem, FundMeta, NAVEntry } from '../types/fund';

const BASE = 'https://api.mfapi.in/mf';

export async function fetchAllFunds(): Promise<FundListItem[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error(`Failed to fetch fund list: ${res.status}`);
  return res.json();
}

export interface FundDetailResponse {
  meta: FundMeta;
  data: NAVEntry[];
  status: string;
}

export async function fetchFundDetail(
  schemeCode: number,
  signal?: AbortSignal,
): Promise<FundDetailResponse> {
  const res = await fetch(`${BASE}/${schemeCode}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'SUCCESS') throw new Error('API returned non-success status');
  return json;
}

export async function fetchFundDetailWithRetry(
  schemeCode: number,
  signal?: AbortSignal,
  retries = 2,
): Promise<FundDetailResponse> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchFundDetail(schemeCode, signal);
    } catch (err) {
      if (signal?.aborted) throw err;
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}
