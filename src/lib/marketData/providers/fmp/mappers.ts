import type {
  FmpAnalystEstimate,
  FmpBalanceSheet,
  FmpCashFlowStatement,
  FmpCompanyProfile,
  FmpEconomicCalendarEvent,
  FmpEnterpriseValue,
  FmpExecutive,
  FmpFinancialRatios,
  FmpIncomeStatement,
  FmpKeyMetrics,
  FmpMarketMover,
  FmpSecFiling,
  FmpStatementPeriod,
} from "../../contracts/fmp";
import type { CorporateEvent } from "../../contracts/events";
import {
  fmpAnalystEstimateSchema,
  fmpBalanceSheetSchema,
  fmpCashFlowStatementSchema,
  fmpCompanyProfileSchema,
  fmpEnterpriseValueSchema,
  fmpExecutiveSchema,
  fmpEconomicCalendarEventSchema,
  fmpFinancialRatiosSchema,
  fmpIncomeStatementSchema,
  fmpKeyMetricsSchema,
  fmpMarketMoverSchema,
  fmpSecFilingSchema,
} from "../../schemas/response";
import { fiscalYearFromRow, num, periodFromRow, str } from "./client";

function validate<T>(
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T } },
  value: unknown,
): T | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? (parsed.data as T) : null;
}

export function mapFmpCompanyProfile(
  symbol: string,
  row: Record<string, unknown>,
): FmpCompanyProfile | null {
  const mapped: FmpCompanyProfile = {
    symbol: symbol.toUpperCase(),
    name: str(row.companyName) ?? str(row.name) ?? symbol,
    exchange: str(row.exchange) ?? str(row.exchangeShortName),
    currency: str(row.currency),
    sector: str(row.sector),
    industry: str(row.industry),
    country: str(row.country),
    website: str(row.website),
    description: str(row.description),
    ceo: str(row.ceo),
    beta: num(row.beta),
    marketCap: num(row.marketCap) ?? num(row.mktCap),
    price: num(row.price),
    updatedAt: Date.now(),
  };
  return validate(fmpCompanyProfileSchema, mapped);
}

export function mapFmpAnalystEstimate(
  symbol: string,
  row: Record<string, unknown>,
): FmpAnalystEstimate | null {
  const date = str(row.date);
  if (!date) return null;
  const mapped: FmpAnalystEstimate = {
    symbol: symbol.toUpperCase(),
    date,
    revenueLow: num(row.revenueLow),
    revenueHigh: num(row.revenueHigh),
    revenueAvg: num(row.revenueAvg),
    epsLow: num(row.epsLow),
    epsHigh: num(row.epsHigh),
    epsAvg: num(row.epsAvg),
    ebitdaLow: num(row.ebitdaLow),
    ebitdaHigh: num(row.ebitdaHigh),
    ebitdaAvg: num(row.ebitdaAvg),
  };
  return validate(fmpAnalystEstimateSchema, mapped);
}

export function mapFmpIncomeStatement(
  symbol: string,
  row: Record<string, unknown>,
): FmpIncomeStatement | null {
  const date = str(row.date);
  if (!date) return null;
  const mapped: FmpIncomeStatement = {
    symbol: symbol.toUpperCase(),
    date,
    fiscalYear: fiscalYearFromRow(row),
    period: periodFromRow(row),
    reportedCurrency: str(row.reportedCurrency) ?? str(row.currency),
    revenue: num(row.revenue),
    grossProfit: num(row.grossProfit),
    operatingIncome: num(row.operatingIncome),
    netIncome: num(row.netIncome),
    eps: num(row.eps),
    epsDiluted: num(row.epsdiluted) ?? num(row.epsDiluted),
  };
  return validate(fmpIncomeStatementSchema, mapped);
}

export function mapFmpBalanceSheet(
  symbol: string,
  row: Record<string, unknown>,
): FmpBalanceSheet | null {
  const date = str(row.date);
  if (!date) return null;
  const mapped: FmpBalanceSheet = {
    symbol: symbol.toUpperCase(),
    date,
    fiscalYear: fiscalYearFromRow(row),
    period: periodFromRow(row),
    reportedCurrency: str(row.reportedCurrency) ?? str(row.currency),
    totalAssets: num(row.totalAssets),
    totalLiabilities: num(row.totalLiabilities),
    totalStockholdersEquity: num(row.totalStockholdersEquity),
    totalDebt: num(row.totalDebt),
    cashAndCashEquivalents: num(row.cashAndCashEquivalents),
  };
  return validate(fmpBalanceSheetSchema, mapped);
}

export function mapFmpCashFlowStatement(
  symbol: string,
  row: Record<string, unknown>,
): FmpCashFlowStatement | null {
  const date = str(row.date);
  if (!date) return null;
  const mapped: FmpCashFlowStatement = {
    symbol: symbol.toUpperCase(),
    date,
    fiscalYear: fiscalYearFromRow(row),
    period: periodFromRow(row),
    reportedCurrency: str(row.reportedCurrency) ?? str(row.currency),
    operatingCashFlow: num(row.operatingCashFlow),
    capitalExpenditure: num(row.capitalExpenditure),
    freeCashFlow: num(row.freeCashFlow),
    netCashProvidedByOperatingActivities: num(row.netCashProvidedByOperatingActivities),
  };
  return validate(fmpCashFlowStatementSchema, mapped);
}

export function mapFmpKeyMetrics(
  symbol: string,
  row: Record<string, unknown>,
): FmpKeyMetrics | null {
  const date = str(row.date);
  if (!date) return null;
  const mapped: FmpKeyMetrics = {
    symbol: symbol.toUpperCase(),
    date,
    fiscalYear: fiscalYearFromRow(row),
    period: periodFromRow(row),
    marketCap: num(row.marketCap),
    peRatio: num(row.peRatio),
    priceToSalesRatio: num(row.priceToSalesRatio),
    enterpriseValue: num(row.enterpriseValue),
    evToSales: num(row.evToSales),
    evToOperatingCashFlow: num(row.evToOperatingCashFlow),
    returnOnEquity: num(row.returnOnEquity),
    returnOnAssets: num(row.returnOnAssets),
    netProfitMargin: num(row.netProfitMargin),
  };
  return validate(fmpKeyMetricsSchema, mapped);
}

export function mapFmpFinancialRatios(
  symbol: string,
  row: Record<string, unknown>,
): FmpFinancialRatios | null {
  const date = str(row.date);
  if (!date) return null;
  const mapped: FmpFinancialRatios = {
    symbol: symbol.toUpperCase(),
    date,
    fiscalYear: fiscalYearFromRow(row),
    period: periodFromRow(row),
    grossProfitMargin: num(row.grossProfitMargin),
    operatingProfitMargin: num(row.operatingProfitMargin),
    netProfitMargin: num(row.netProfitMargin),
    currentRatio: num(row.currentRatio),
    debtEquityRatio: num(row.debtEquityRatio),
    priceToEarningsRatio: num(row.priceToEarningsRatio),
    priceToBookRatio: num(row.priceToBookRatio),
  };
  return validate(fmpFinancialRatiosSchema, mapped);
}

export function mapFmpEnterpriseValue(
  symbol: string,
  row: Record<string, unknown>,
): FmpEnterpriseValue | null {
  const date = str(row.date);
  if (!date) return null;
  const mapped: FmpEnterpriseValue = {
    symbol: symbol.toUpperCase(),
    date,
    stockPrice: num(row.stockPrice),
    numberOfShares: num(row.numberOfShares),
    marketCapitalization: num(row.marketCapitalization),
    enterpriseValue: num(row.enterpriseValue),
  };
  return validate(fmpEnterpriseValueSchema, mapped);
}

export function mapFmpExecutive(row: Record<string, unknown>): FmpExecutive | null {
  const name = str(row.name);
  if (!name) return null;
  const mapped: FmpExecutive = {
    name,
    title: str(row.title),
    pay: num(row.pay),
    currencyPay: str(row.currencyPay),
    gender: str(row.gender),
    yearBorn: num(row.yearBorn),
  };
  return validate(fmpExecutiveSchema, mapped);
}

export function mapFmpMarketMover(row: Record<string, unknown>): FmpMarketMover | null {
  const symbol = str(row.symbol);
  if (!symbol) return null;
  const mapped: FmpMarketMover = {
    symbol: symbol.toUpperCase(),
    name: str(row.name) ?? str(row.companyName),
    price: num(row.price),
    change: num(row.change),
    changePercent: num(row.changesPercentage) ?? num(row.changePercent),
    exchange: str(row.exchange),
    volume: num(row.volume),
  };
  return validate(fmpMarketMoverSchema, mapped);
}

export function mapFmpSecFiling(
  symbol: string,
  row: Record<string, unknown>,
): FmpSecFiling | null {
  const formType = str(row.formType) ?? str(row.form);
  const filingDate = str(row.filingDate) ?? str(row.date);
  if (!formType || !filingDate) return null;
  const mapped: FmpSecFiling = {
    symbol: symbol.toUpperCase(),
    cik: str(row.cik),
    formType,
    filingDate,
    acceptedDate: str(row.acceptedDate),
    url: str(row.link) ?? str(row.finalLink) ?? str(row.url),
  };
  return validate(fmpSecFilingSchema, mapped);
}

export function mapFmpEconomicCalendarEvent(
  row: Record<string, unknown>,
): FmpEconomicCalendarEvent | null {
  const date = str(row.date);
  const country = str(row.country);
  const event = str(row.event);
  if (!date || !country || !event) return null;

  const mapped: FmpEconomicCalendarEvent = {
    date,
    country: country.toUpperCase(),
    event,
    currency: str(row.currency),
    previous: num(row.previous),
    estimate: num(row.estimate),
    actual: num(row.actual),
    change: num(row.change),
    changePercentage: num(row.changePercentage),
    impact: str(row.impact),
  };
  return validate(fmpEconomicCalendarEventSchema, mapped);
}

/** True when row has no symbol or matches the requested symbol. */
export function fmpRowMatchesSymbol(row: Record<string, unknown>, symbol: string): boolean {
  const rowSymbol = str(row.symbol)?.toUpperCase();
  if (!rowSymbol) return true;
  return rowSymbol === symbol.toUpperCase();
}

export function mapFmpSplitEvent(symbol: string, row: Record<string, unknown>): CorporateEvent | null {
  if (!fmpRowMatchesSymbol(row, symbol)) return null;
  const date = str(row.date);
  if (!date) return null;
  const numerator = num(row.numerator);
  const denominator = num(row.denominator);
  return {
    id: `fmp-split-${symbol}-${date}`,
    type: "split",
    symbol,
    title: `${symbol} stock split`,
    scheduledAt: date,
    source: "fmp",
    details: {
      numerator,
      denominator,
      splitType: str(row.splitType),
    },
  };
}

export function mapRows<T>(
  rows: unknown,
  mapper: (row: Record<string, unknown>) => T | null,
): T[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
    .map(mapper)
    .filter((row): row is T => row != null);
}

export function fmpPeriodParam(period: FmpStatementPeriod): string {
  return period;
}
