export interface Holding {
  schemeName: string;
  folioNo: string;
  units: number;
  costValue: number;
  marketValue: number;
  isin?: string;
  /** matched schemeCode from AMFI list */
  schemeCode?: number;
}

export interface CASData {
  investorName?: string;
  pan?: string;
  statementDate?: string;
  holdings: Holding[];
  totalCost: number;
  totalMarketValue: number;
}
