/** Normalized FMP gap-fill datasets (fundamentals/context, not live quotes). */

export type FmpStatementPeriod = "annual" | "quarter";

export type FmpCompanyProfile = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  currency: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  ceo: string | null;
  beta: number | null;
  marketCap: number | null;
  price: number | null;
  updatedAt: number;
};

export type FmpAnalystEstimate = {
  symbol: string;
  date: string;
  revenueLow: number | null;
  revenueHigh: number | null;
  revenueAvg: number | null;
  epsLow: number | null;
  epsHigh: number | null;
  epsAvg: number | null;
  ebitdaLow: number | null;
  ebitdaHigh: number | null;
  ebitdaAvg: number | null;
};

export type FmpIncomeStatement = {
  symbol: string;
  date: string;
  fiscalYear: string | null;
  period: string | null;
  reportedCurrency: string | null;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  eps: number | null;
  epsDiluted: number | null;
};

export type FmpBalanceSheet = {
  symbol: string;
  date: string;
  fiscalYear: string | null;
  period: string | null;
  reportedCurrency: string | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalStockholdersEquity: number | null;
  totalDebt: number | null;
  cashAndCashEquivalents: number | null;
};

export type FmpCashFlowStatement = {
  symbol: string;
  date: string;
  fiscalYear: string | null;
  period: string | null;
  reportedCurrency: string | null;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  netCashProvidedByOperatingActivities: number | null;
};

export type FmpKeyMetrics = {
  symbol: string;
  date: string;
  fiscalYear: string | null;
  period: string | null;
  marketCap: number | null;
  peRatio: number | null;
  priceToSalesRatio: number | null;
  enterpriseValue: number | null;
  evToSales: number | null;
  evToOperatingCashFlow: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  netProfitMargin: number | null;
};

export type FmpFinancialRatios = {
  symbol: string;
  date: string;
  fiscalYear: string | null;
  period: string | null;
  grossProfitMargin: number | null;
  operatingProfitMargin: number | null;
  netProfitMargin: number | null;
  currentRatio: number | null;
  debtEquityRatio: number | null;
  priceToEarningsRatio: number | null;
  priceToBookRatio: number | null;
};

export type FmpEnterpriseValue = {
  symbol: string;
  date: string;
  stockPrice: number | null;
  numberOfShares: number | null;
  marketCapitalization: number | null;
  enterpriseValue: number | null;
};

export type FmpFinancialsBundle = {
  symbol: string;
  period: FmpStatementPeriod;
  incomeStatements: FmpIncomeStatement[];
  balanceSheets: FmpBalanceSheet[];
  cashFlowStatements: FmpCashFlowStatement[];
  keyMetrics: FmpKeyMetrics[];
  ratios: FmpFinancialRatios[];
  enterpriseValues: FmpEnterpriseValue[];
};

export type FmpExecutive = {
  name: string;
  title: string | null;
  pay: number | null;
  currencyPay: string | null;
  gender: string | null;
  yearBorn: number | null;
};

export type FmpMarketMoverKind = "gainers" | "losers" | "actives";

export type FmpMarketMover = {
  symbol: string;
  name: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  exchange: string | null;
  volume: number | null;
};

export type FmpSecFiling = {
  symbol: string;
  cik: string | null;
  formType: string;
  filingDate: string;
  acceptedDate: string | null;
  url: string | null;
};

/** Raw normalized row from FMP `/stable/economic-calendar`. */
export type FmpEconomicCalendarEvent = {
  date: string;
  country: string;
  event: string;
  currency: string | null;
  previous: number | null;
  estimate: number | null;
  actual: number | null;
  change: number | null;
  changePercentage: number | null;
  impact: string | null;
};
