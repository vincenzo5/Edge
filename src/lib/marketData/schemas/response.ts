import { z } from "zod";

const finiteOrNull = z.number().finite().nullable();

export const equityCandleSchema = z.object({
  t: z.number().finite(),
  o: z.number().finite(),
  h: z.number().finite(),
  l: z.number().finite(),
  c: z.number().finite(),
  v: z.number().finite().optional(),
});

export const equityQuoteSchema = z.object({
  symbol: z.string(),
  shortName: z.string().optional(),
  exchange: z.string().optional(),
  currency: z.string().optional(),
  price: finiteOrNull,
  change: finiteOrNull,
  changePercent: finiteOrNull,
  volume: finiteOrNull,
  marketState: z.string().optional(),
  updatedAt: z.number().finite(),
});

export const fundamentalsSnapshotSchema = z.object({
  symbol: z.string(),
  shortName: z.string().nullable(),
  longName: z.string().nullable(),
  exchange: z.string().nullable(),
  currency: z.string().nullable(),
  regularMarketPrice: finiteOrNull,
  regularMarketChange: finiteOrNull,
  regularMarketChangePercent: finiteOrNull,
  marketCap: finiteOrNull,
  volume: finiteOrNull,
  averageVolume: finiteOrNull,
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  website: z.string().nullable(),
  description: z.string().nullable(),
  updatedAt: z.number().finite(),
});

export const optionTypeSchema = z.enum(["call", "put"]);

export const optionContractSnapshotSchema = z
  .object({
    contractSymbol: z.string().min(1),
    underlying: z.string().min(1),
    type: optionTypeSchema,
    expiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    strike: z.number().finite().positive(),
    bid: finiteOrNull.optional(),
    ask: finiteOrNull.optional(),
    last: finiteOrNull.optional(),
    mark: finiteOrNull.optional(),
    volume: finiteOrNull.optional(),
    openInterest: finiteOrNull.optional(),
    impliedVolatility: finiteOrNull.optional(),
    delta: finiteOrNull.optional(),
    gamma: finiteOrNull.optional(),
    theta: finiteOrNull.optional(),
    vega: finiteOrNull.optional(),
    rho: finiteOrNull.optional(),
    updatedAt: z.number().finite(),
  })
  .superRefine((val, ctx) => {
    if (val.bid != null && val.ask != null && val.bid > val.ask) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "bid must not exceed ask",
        path: ["bid"],
      });
    }
  });

export const optionsChainResponseSchema = z.object({
  underlying: z.string().min(1),
  expiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contracts: z.array(optionContractSnapshotSchema),
});

export const optionExpirationSchema = z.object({
  underlying: z.string().min(1),
  expiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isWeekly: z.boolean().optional(),
  isStandard: z.boolean().optional(),
});

export const newsItemSchema = z.object({
  id: z.string(),
  headline: z.string(),
  source: z.string(),
  url: z.string().optional(),
  symbols: z.array(z.string()),
  publishedAt: z.string(),
  summary: z.string().optional(),
  sentiment: z.number().optional(),
});

export const corporateEventSchema = z.object({
  id: z.string(),
  type: z.enum(["earnings", "dividend", "split", "filing", "economic", "other"]),
  symbol: z.string().optional(),
  title: z.string(),
  scheduledAt: z.string().optional(),
  reportedAt: z.string().optional(),
  source: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const marketEventSchema = z.object({
  id: z.string(),
  canonicalId: z.string(),
  family: z.enum(["corporate", "filing", "macro", "news", "market_structure"]),
  category: z.string().optional(),
  title: z.string(),
  scheduledAt: z.string(),
  actualAt: z.string().optional(),
  status: z.enum(["scheduled", "released", "revised", "cancelled"]),
  importance: z.enum(["low", "medium", "high"]),
  country: z.string().optional(),
  symbol: z.string().optional(),
  affectedAssets: z.array(z.string()).optional(),
  actual: z.union([z.number(), z.string()]).nullable().optional(),
  forecast: z.union([z.number(), z.string()]).nullable().optional(),
  previous: z.union([z.number(), z.string()]).nullable().optional(),
  revisedPrevious: z.union([z.number(), z.string()]).nullable().optional(),
  surprise: z.number().nullable().optional(),
  source: z.string(),
  sourceEventId: z.string().optional(),
  coverageLevel: z.enum(["full", "partial"]).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  /** Legacy chart/API compatibility field derived from canonicalId. */
  type: z.enum(["earnings", "dividend", "split", "filing", "economic", "other"]).optional(),
});

export const fmpCompanyProfileSchema = z.object({
  symbol: z.string(),
  name: z.string().nullable(),
  exchange: z.string().nullable(),
  currency: z.string().nullable(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  country: z.string().nullable(),
  website: z.string().nullable(),
  description: z.string().nullable(),
  ceo: z.string().nullable(),
  beta: finiteOrNull,
  marketCap: finiteOrNull,
  price: finiteOrNull,
  updatedAt: z.number().finite(),
});

export const fmpAnalystEstimateSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  revenueLow: finiteOrNull,
  revenueHigh: finiteOrNull,
  revenueAvg: finiteOrNull,
  epsLow: finiteOrNull,
  epsHigh: finiteOrNull,
  epsAvg: finiteOrNull,
  ebitdaLow: finiteOrNull,
  ebitdaHigh: finiteOrNull,
  ebitdaAvg: finiteOrNull,
});

export const fmpIncomeStatementSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  fiscalYear: z.string().nullable(),
  period: z.string().nullable(),
  reportedCurrency: z.string().nullable(),
  revenue: finiteOrNull,
  grossProfit: finiteOrNull,
  operatingIncome: finiteOrNull,
  netIncome: finiteOrNull,
  eps: finiteOrNull,
  epsDiluted: finiteOrNull,
});

export const fmpBalanceSheetSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  fiscalYear: z.string().nullable(),
  period: z.string().nullable(),
  reportedCurrency: z.string().nullable(),
  totalAssets: finiteOrNull,
  totalLiabilities: finiteOrNull,
  totalStockholdersEquity: finiteOrNull,
  totalDebt: finiteOrNull,
  cashAndCashEquivalents: finiteOrNull,
});

export const fmpCashFlowStatementSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  fiscalYear: z.string().nullable(),
  period: z.string().nullable(),
  reportedCurrency: z.string().nullable(),
  operatingCashFlow: finiteOrNull,
  capitalExpenditure: finiteOrNull,
  freeCashFlow: finiteOrNull,
  netCashProvidedByOperatingActivities: finiteOrNull,
});

export const fmpKeyMetricsSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  fiscalYear: z.string().nullable(),
  period: z.string().nullable(),
  marketCap: finiteOrNull,
  peRatio: finiteOrNull,
  priceToSalesRatio: finiteOrNull,
  enterpriseValue: finiteOrNull,
  evToSales: finiteOrNull,
  evToOperatingCashFlow: finiteOrNull,
  returnOnEquity: finiteOrNull,
  returnOnAssets: finiteOrNull,
  netProfitMargin: finiteOrNull,
});

export const fmpFinancialRatiosSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  fiscalYear: z.string().nullable(),
  period: z.string().nullable(),
  grossProfitMargin: finiteOrNull,
  operatingProfitMargin: finiteOrNull,
  netProfitMargin: finiteOrNull,
  currentRatio: finiteOrNull,
  debtEquityRatio: finiteOrNull,
  priceToEarningsRatio: finiteOrNull,
  priceToBookRatio: finiteOrNull,
});

export const fmpEnterpriseValueSchema = z.object({
  symbol: z.string(),
  date: z.string(),
  stockPrice: finiteOrNull,
  numberOfShares: finiteOrNull,
  marketCapitalization: finiteOrNull,
  enterpriseValue: finiteOrNull,
});

export const fmpFinancialsBundleSchema = z.object({
  symbol: z.string(),
  period: z.enum(["annual", "quarter"]),
  incomeStatements: z.array(fmpIncomeStatementSchema),
  balanceSheets: z.array(fmpBalanceSheetSchema),
  cashFlowStatements: z.array(fmpCashFlowStatementSchema),
  keyMetrics: z.array(fmpKeyMetricsSchema),
  ratios: z.array(fmpFinancialRatiosSchema),
  enterpriseValues: z.array(fmpEnterpriseValueSchema),
});

export const fmpExecutiveSchema = z.object({
  name: z.string(),
  title: z.string().nullable(),
  pay: finiteOrNull,
  currencyPay: z.string().nullable(),
  gender: z.string().nullable(),
  yearBorn: finiteOrNull,
});

export const fmpMarketMoverSchema = z.object({
  symbol: z.string(),
  name: z.string().nullable(),
  price: finiteOrNull,
  change: finiteOrNull,
  changePercent: finiteOrNull,
  exchange: z.string().nullable(),
  volume: finiteOrNull,
});

export const fmpSecFilingSchema = z.object({
  symbol: z.string(),
  cik: z.string().nullable(),
  formType: z.string(),
  filingDate: z.string(),
  acceptedDate: z.string().nullable(),
  url: z.string().nullable(),
});

export const fmpEconomicCalendarEventSchema = z.object({
  date: z.string(),
  country: z.string(),
  event: z.string(),
  currency: z.string().nullable(),
  previous: finiteOrNull,
  estimate: finiteOrNull,
  actual: finiteOrNull,
  change: finiteOrNull,
  changePercentage: finiteOrNull,
  impact: z.string().nullable(),
});
