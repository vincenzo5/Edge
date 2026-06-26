export type FundamentalsSnapshot = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  exchange: string | null;
  currency: string | null;
  regularMarketPrice: number | null;
  regularMarketChange: number | null;
  regularMarketChangePercent: number | null;
  marketCap: number | null;
  volume: number | null;
  averageVolume: number | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  updatedAt: number;
};

export type SecFiling = {
  symbol: string;
  cik: string;
  form: string;
  filedAt: string;
  accessionNumber: string;
  primaryDocument?: string;
  url?: string;
};

export type SecCompanyFacts = {
  symbol: string;
  cik: string;
  entityName?: string;
  facts?: Record<string, unknown>;
};
