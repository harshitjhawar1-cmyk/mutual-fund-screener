export type FundStatus = 'idle' | 'loading' | 'loaded' | 'error';
export type PlanType = 'Direct' | 'Regular' | 'Unknown';

export interface FundListItem {
  schemeCode: number;
  schemeName: string;
}

export interface NAVEntry {
  date: string; // "DD-MM-YYYY"
  nav: string;
}

export interface FundMeta {
  fund_house: string;
  scheme_type: string;
  scheme_category: string;
  scheme_code: number;
  scheme_name: string;
}

export interface FundReturns {
  sixMonth?: number;
  oneYear?: number;
  threeYear?: number;
  fiveYear?: number;
  sevenYear?: number;
  tenYear?: number;
}

export interface FundDetails {
  fundHouse: string;
  category: string;
  currentNAV: number;
  navDate: string;
  returns: FundReturns;
  xirr?: number;  // 3Y lump sum (= 3Y CAGR)
  cagr?: number;  // since inception
}

export interface Fund extends FundListItem {
  planType: PlanType;
  status: FundStatus;
  fundHouse?: string;
  category?: string;
  currentNAV?: number;
  navDate?: string;
  returns?: FundReturns;
  xirr?: number;
  cagr?: number;
  percentile3Y?: number; // 0–100: % of category peers with lower 3Y return
}

export interface FilterState {
  category: string;
  planType: string;
  fundHouse: string;
  schemeType: string;
  search: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: keyof Fund | 'returns.sixMonth' | 'returns.oneYear' | 'returns.threeYear' | 'returns.fiveYear' | 'returns.sevenYear' | 'returns.tenYear' | null;
  direction: SortDirection;
}
