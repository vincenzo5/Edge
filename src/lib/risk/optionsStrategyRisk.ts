import { z } from "zod";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import { priceOptionLeg } from "./optionPresetChain";

export const EntryPriceModeSchema = z.enum(["bid", "mid", "ask", "last", "custom"]);
export const ExitPriceModeSchema = z.enum(["bid", "mid"]);
export const IvScenarioSchema = z.enum(["down", "unchanged", "up"]);

export type EntryPriceMode = z.infer<typeof EntryPriceModeSchema>;
export type ExitPriceMode = z.infer<typeof ExitPriceModeSchema>;
export type IvScenario = z.infer<typeof IvScenarioSchema>;

export const StrategyLegInputSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["buy", "sell"]),
  type: z.enum(["call", "put"]),
  expiration: z.string().min(1),
  strike: z.number().positive().finite(),
  quantity: z.number().int().positive().max(10_000),
  contractSymbol: z.string().optional(),
  entryPremium: z.number().finite().nonnegative().optional(),
  impliedVolatility: z.number().finite().nonnegative().nullable().optional(),
});

export type StrategyLegInput = z.infer<typeof StrategyLegInputSchema>;

export const RiskCalculatorInputsSchema = z.object({
  symbol: z.string().min(1),
  spotPrice: z.number().positive().finite(),
  maxRisk: z.number().positive().max(10_000_000).finite(),
  legs: z.array(StrategyLegInputSchema).min(1).max(8),
  entryPriceMode: EntryPriceModeSchema,
  exitPriceMode: ExitPriceModeSchema,
  ivScenario: IvScenarioSchema,
  manualContracts: z.number().int().positive().max(10_000).optional(),
});

export type RiskCalculatorInputs = z.infer<typeof RiskCalculatorInputsSchema>;

export type ValidationSeverity = "hard" | "soft";

export type ValidationIssue = {
  field?: string;
  message: string;
  severity: ValidationSeverity;
};

export type ResolvedLeg = StrategyLegInput & {
  entryPremium: number;
  impliedVolatility: number | null;
  contractSymbol: string;
};

export type MaxLossResult =
  | { kind: "defined"; maxLossPerUnit: number; maxProfitPerUnit: number | null }
  | { kind: "undefined"; reason: string };

export type PayoffCell = {
  exitDate: string;
  daysToExit: number;
  underlyingPrice: number;
  strategyValue: number;
  netPnl: number;
  returnPct: number;
  isExpiration: boolean;
};

export type PayoffGrid = {
  exitDates: string[];
  underlyingPrices: number[];
  cells: PayoffCell[][];
  selectedCell: PayoffCell | null;
};

export type StrategyRiskSummary = {
  contracts: number;
  totalCost: number;
  maxLoss: number | null;
  maxProfit: number | null;
  breakevens: number[];
  sizingMode: "auto" | "manual";
  sizingReason?: string;
};

export type StrategyRiskResult = {
  ok: boolean;
  inputs: RiskCalculatorInputs | null;
  legs: ResolvedLeg[];
  summary: StrategyRiskSummary | null;
  grid: PayoffGrid | null;
  hardIssues: ValidationIssue[];
  softIssues: ValidationIssue[];
};

const IV_SCENARIO_MULTIPLIER: Record<IvScenario, number> = {
  down: 0.85,
  unchanged: 1,
  up: 1.15,
};

const RISK_FREE_RATE = 0.045;
const MIN_OPTION_VOLUME = 10;
const MAX_BID_ASK_SPREAD_RATIO = 0.15;

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMoney(value: number): number {
  return Math.round(value);
}

function roundPct(value: number): number {
  return Math.round(value * 10) / 10;
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * abs);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-abs * abs);
  return sign * y;
}

function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export function blackScholesPrice(args: {
  type: "call" | "put";
  spot: number;
  strike: number;
  daysToExpiration: number;
  iv: number;
  riskFreeRate?: number;
}): number {
  const { type, spot, strike, daysToExpiration, iv } = args;
  const r = args.riskFreeRate ?? RISK_FREE_RATE;
  if (daysToExpiration <= 0) {
    return type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
  }
  const T = daysToExpiration / 365;
  if (iv <= 0 || spot <= 0 || strike <= 0) {
    return type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
  }
  const d1 =
    (Math.log(spot / strike) + (r + 0.5 * iv * iv) * T) / (iv * Math.sqrt(T));
  const d2 = d1 - iv * Math.sqrt(T);
  if (type === "call") {
    return spot * normalCdf(d1) - strike * Math.exp(-r * T) * normalCdf(d2);
  }
  return strike * Math.exp(-r * T) * normalCdf(-d2) - spot * normalCdf(-d1);
}

function midPrice(contract: OptionContractSnapshot): number | null {
  const { bid, ask, mark, last } = contract;
  if (bid != null && ask != null && Number.isFinite(bid) && Number.isFinite(ask)) {
    return (bid + ask) / 2;
  }
  if (mark != null && Number.isFinite(mark)) return mark;
  if (last != null && Number.isFinite(last)) return last;
  return priceOptionLeg(contract, "buy").premium;
}

export function resolveEntryPremium(
  contract: OptionContractSnapshot | undefined,
  mode: EntryPriceMode,
  customPremium?: number,
): number | null {
  if (mode === "custom") {
    return customPremium != null && Number.isFinite(customPremium) && customPremium >= 0
      ? customPremium
      : null;
  }
  if (!contract) return null;
  if (mode === "bid") return contract.bid ?? null;
  if (mode === "ask") return priceOptionLeg(contract, "buy").premium;
  if (mode === "last") return contract.last ?? null;
  return midPrice(contract);
}

export function resolveExitPremium(
  contract: OptionContractSnapshot | undefined,
  mode: ExitPriceMode,
  modeledPremium: number,
): number {
  if (!contract) return modeledPremium;
  if (mode === "mid") return midPrice(contract) ?? modeledPremium;
  return contract.bid ?? midPrice(contract) ?? modeledPremium;
}

function daysBetween(from: Date, to: Date): number {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function parseExpirationDate(expiration: string): Date | null {
  const ms = Date.parse(`${expiration}T16:00:00.000Z`);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

export function buildExitDates(expiration: string, now = new Date()): string[] {
  const expDate = parseExpirationDate(expiration);
  if (!expDate) return [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let offset = 0; offset <= 5; offset += 1) {
    const candidate = new Date(expDate);
    candidate.setDate(candidate.getDate() - offset);
    if (candidate < today) continue;
    dates.push(candidate.toISOString().slice(0, 10));
  }
  if (dates.length === 0) {
    dates.push(expiration);
  }
  return [...new Set(dates)].sort((a, b) => a.localeCompare(b));
}

export function buildTargetPrices(
  spot: number,
  legs: StrategyLegInput[],
  count = 7,
): number[] {
  const strikes = legs.map((leg) => leg.strike);
  const minStrike = Math.min(...strikes, spot * 0.9);
  const maxStrike = Math.max(...strikes, spot * 1.1);
  const low = Math.min(spot * 0.95, minStrike);
  const high = Math.max(spot * 1.05, maxStrike);
  const step = (high - low) / Math.max(1, count - 1);
  const prices = new Set<number>();
  prices.add(roundPrice(spot));
  for (const strike of strikes) prices.add(roundPrice(strike));
  for (let i = 0; i < count; i += 1) {
    prices.add(roundPrice(low + step * i));
  }
  return [...prices].sort((a, b) => a - b);
}

function intrinsicValue(type: "call" | "put", spot: number, strike: number): number {
  return type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
}

function legExpirationPayoff(leg: ResolvedLeg, spot: number): number {
  const intrinsic = intrinsicValue(leg.type, spot, leg.strike);
  const signed = leg.action === "buy" ? intrinsic : -intrinsic;
  return signed * leg.quantity;
}

function legModeledPayoff(
  leg: ResolvedLeg,
  spot: number,
  daysToExit: number,
  ivScenario: IvScenario,
): number {
  if (daysToExit <= 0) {
    return legExpirationPayoff(leg, spot);
  }
  const ivBase = leg.impliedVolatility;
  if (ivBase == null || !Number.isFinite(ivBase) || ivBase <= 0) {
    return legExpirationPayoff(leg, spot);
  }
  const iv = ivBase * IV_SCENARIO_MULTIPLIER[ivScenario];
  const premium = blackScholesPrice({
    type: leg.type,
    spot,
    strike: leg.strike,
    daysToExpiration: daysToExit,
    iv,
  });
  const signed = leg.action === "buy" ? premium : -premium;
  return signed * leg.quantity;
}

export function strategyValueAtScenario(
  legs: ResolvedLeg[],
  underlyingPrice: number,
  daysToExit: number,
  ivScenario: IvScenario,
): number {
  return legs.reduce(
    (total, leg) => total + legModeledPayoff(leg, underlyingPrice, daysToExit, ivScenario),
    0,
  );
}

function netDebit(legs: ResolvedLeg[]): number {
  return legs.reduce((total, leg) => {
    const premium = leg.entryPremium;
    return leg.action === "buy" ? total + premium * leg.quantity : total - premium * leg.quantity;
  }, 0);
}

function hasNakedShort(legs: ResolvedLeg[]): boolean {
  const callBuys = legs
    .filter((leg) => leg.type === "call" && leg.action === "buy")
    .reduce((sum, leg) => sum + leg.quantity, 0);
  const callSells = legs
    .filter((leg) => leg.type === "call" && leg.action === "sell")
    .reduce((sum, leg) => sum + leg.quantity, 0);
  const putBuys = legs
    .filter((leg) => leg.type === "put" && leg.action === "buy")
    .reduce((sum, leg) => sum + leg.quantity, 0);
  const putSells = legs
    .filter((leg) => leg.type === "put" && leg.action === "sell")
    .reduce((sum, leg) => sum + leg.quantity, 0);
  return callSells > callBuys || putSells > putBuys;
}

function sameExpiration(legs: ResolvedLeg[]): boolean {
  const expirations = new Set(legs.map((leg) => leg.expiration));
  return expirations.size === 1;
}

function estimateMaxLossPerUnit(legs: ResolvedLeg[]): MaxLossResult {
  if (legs.length === 0) {
    return { kind: "undefined", reason: "No legs configured" };
  }
  if (hasNakedShort(legs)) {
    return { kind: "undefined", reason: "Naked short exposure — max loss is undefined" };
  }
  if (!sameExpiration(legs)) {
    return { kind: "undefined", reason: "Mixed expirations — auto sizing unavailable" };
  }

  const debit = netDebit(legs);
  if (debit > 0) {
    const samplePrices = buildTargetPrices(legs[0]?.strike ?? 100, legs, 25);
    let maxPayoff = Number.NEGATIVE_INFINITY;
    for (const price of samplePrices) {
      const payoff = strategyValueAtScenario(legs, price, 0, "unchanged");
      maxPayoff = Math.max(maxPayoff, payoff);
    }
    return {
      kind: "defined",
      maxLossPerUnit: roundPrice(debit),
      maxProfitPerUnit: roundPrice(Math.max(0, maxPayoff)),
    };
  }

  const samplePrices = buildTargetPrices(
    legs[0]?.strike ?? 100,
    legs,
    25,
  );
  let minPayoff = Number.POSITIVE_INFINITY;
  let maxPayoff = Number.NEGATIVE_INFINITY;
  for (const price of samplePrices) {
    const payoff = strategyValueAtScenario(legs, price, 0, "unchanged");
    minPayoff = Math.min(minPayoff, payoff);
    maxPayoff = Math.max(maxPayoff, payoff);
  }
  const maxLossPerUnit = roundPrice(Math.max(0, -minPayoff));
  const maxProfitPerUnit = roundPrice(Math.max(0, maxPayoff));
  if (!Number.isFinite(maxLossPerUnit) || maxLossPerUnit <= 0) {
    return { kind: "undefined", reason: "Could not determine finite max loss" };
  }
  return { kind: "defined", maxLossPerUnit, maxProfitPerUnit };
}

export function sizeContractsFromRisk(
  maxRisk: number,
  maxLossPerUnit: number,
): number {
  if (!Number.isFinite(maxRisk) || !Number.isFinite(maxLossPerUnit) || maxLossPerUnit <= 0) {
    return 0;
  }
  return Math.floor(maxRisk / (maxLossPerUnit * 100));
}

function estimateBreakevens(legs: ResolvedLeg[]): number[] {
  const prices = buildTargetPrices(legs[0]?.strike ?? 100, legs, 40);
  const breakevens: number[] = [];
  for (let i = 1; i < prices.length; i += 1) {
    const prev = strategyValueAtScenario(legs, prices[i - 1]!, 0, "unchanged");
    const curr = strategyValueAtScenario(legs, prices[i]!, 0, "unchanged");
    if ((prev <= 0 && curr >= 0) || (prev >= 0 && curr <= 0)) {
      breakevens.push(roundPrice((prices[i - 1]! + prices[i]!) / 2));
    }
  }
  return breakevens;
}

function liquidityWarnings(contract: OptionContractSnapshot | undefined): string[] {
  const warnings: string[] = [];
  if (!contract) return warnings;
  const volume = contract.volume;
  if (volume == null || volume < MIN_OPTION_VOLUME) {
    warnings.push(`Low volume on ${contract.contractSymbol}`);
  }
  const bid = contract.bid;
  const ask = contract.ask;
  const mid = midPrice(contract);
  if (bid != null && ask != null && mid != null && mid > 0) {
    const spreadRatio = (ask - bid) / mid;
    if (spreadRatio > MAX_BID_ASK_SPREAD_RATIO) {
      warnings.push(`Wide spread on ${contract.contractSymbol}`);
    }
  }
  return warnings;
}

export function validateAndEvaluateStrategy(args: {
  inputs: unknown;
  contractsByKey: Map<string, OptionContractSnapshot>;
  now?: Date;
}): StrategyRiskResult {
  const hardIssues: ValidationIssue[] = [];
  const softIssues: ValidationIssue[] = [];
  const parsed = RiskCalculatorInputsSchema.safeParse(args.inputs);
  if (!parsed.success) {
    return {
      ok: false,
      inputs: null,
      legs: [],
      summary: null,
      grid: null,
      hardIssues: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        severity: "hard" as const,
      })),
      softIssues: [],
    };
  }

  const inputs = parsed.data;
  const now = args.now ?? new Date();
  const resolvedLegs: ResolvedLeg[] = [];

  for (const leg of inputs.legs) {
    const key = `${leg.type}:${leg.strike}:${leg.expiration}`;
    const contract = args.contractsByKey.get(key);
    const entryPremium = resolveEntryPremium(
      contract,
      inputs.entryPriceMode,
      leg.entryPremium,
    );
    if (entryPremium == null) {
      hardIssues.push({
        field: `leg:${leg.id}`,
        message: `Missing entry price for ${leg.action} ${leg.strike}${leg.type === "call" ? "C" : "P"}`,
        severity: "hard",
      });
      continue;
    }
    const iv =
      leg.impliedVolatility ??
      contract?.impliedVolatility ??
      null;
    if (iv == null) {
      softIssues.push({
        field: `leg:${leg.id}`,
        message: `IV missing for ${leg.strike}${leg.type === "call" ? "C" : "P"} — expiration math only`,
        severity: "soft",
      });
    }
    const warnings = liquidityWarnings(contract);
    for (const warning of warnings) {
      softIssues.push({ field: `leg:${leg.id}`, message: warning, severity: "soft" });
    }
    resolvedLegs.push({
      ...leg,
      entryPremium: roundPrice(entryPremium),
      impliedVolatility: iv,
      contractSymbol: leg.contractSymbol ?? contract?.contractSymbol ?? key,
    });
  }

  if (resolvedLegs.length === 0) {
    return {
      ok: false,
      inputs,
      legs: [],
      summary: null,
      grid: null,
      hardIssues,
      softIssues,
    };
  }

  const maxLossResult = estimateMaxLossPerUnit(resolvedLegs);
  let contracts = inputs.manualContracts ?? 0;
  let sizingMode: "auto" | "manual" = "manual";
  let sizingReason: string | undefined;

  if (inputs.manualContracts == null) {
    if (maxLossResult.kind === "defined") {
      contracts = sizeContractsFromRisk(inputs.maxRisk, maxLossResult.maxLossPerUnit);
      sizingMode = "auto";
      if (contracts <= 0) {
        hardIssues.push({
          field: "maxRisk",
          message: "Max risk is too small for one contract at the selected entry price",
          severity: "hard",
        });
      }
    } else {
      sizingReason = maxLossResult.reason;
      softIssues.push({
        field: "maxRisk",
        message: `${maxLossResult.reason}. Enter contracts manually.`,
        severity: "soft",
      });
      contracts = resolvedLegs[0]?.quantity ?? 1;
    }
  } else if (maxLossResult.kind === "undefined") {
    softIssues.push({
      field: "maxRisk",
      message: maxLossResult.reason,
      severity: "soft",
    });
  }

  if (contracts <= 0) {
    return {
      ok: false,
      inputs,
      legs: resolvedLegs,
      summary: null,
      grid: null,
      hardIssues,
      softIssues,
    };
  }

  const scaledLegs = resolvedLegs.map((leg) => ({
    ...leg,
    quantity: contracts * leg.quantity,
  }));

  const maxLossPerUnit =
    maxLossResult.kind === "defined" ? maxLossResult.maxLossPerUnit : null;
  const totalCost = roundMoney(
    scaledLegs.reduce(
      (sum, leg) =>
        leg.action === "buy"
          ? sum + leg.entryPremium * 100 * leg.quantity
          : sum - leg.entryPremium * 100 * leg.quantity,
      0,
    ),
  );
  const summary: StrategyRiskSummary = {
    contracts,
    totalCost: Math.abs(totalCost),
    maxLoss:
      maxLossPerUnit != null ? roundMoney(maxLossPerUnit * 100 * contracts) : null,
    maxProfit:
      maxLossResult.kind === "defined" && maxLossResult.maxProfitPerUnit != null
        ? roundMoney(maxLossResult.maxProfitPerUnit * 100 * contracts)
        : null,
    breakevens: estimateBreakevens(scaledLegs),
    sizingMode,
    sizingReason,
  };

  const primaryExpiration = scaledLegs[0]?.expiration ?? "";
  const exitDates = buildExitDates(primaryExpiration, now);
  const underlyingPrices = buildTargetPrices(inputs.spotPrice, scaledLegs);
  const cells: PayoffCell[][] = [];

  for (const underlyingPrice of underlyingPrices) {
    const row: PayoffCell[] = [];
    for (const exitDate of exitDates) {
      const expDate = parseExpirationDate(primaryExpiration);
      const exit = parseExpirationDate(exitDate);
      const daysToExit =
        expDate && exit ? Math.max(0, daysBetween(exit, expDate)) : 0;
      const isExpiration = exitDate === primaryExpiration;
      const perShareValue = strategyValueAtScenario(
        scaledLegs,
        underlyingPrice,
        isExpiration ? 0 : daysToExit,
        inputs.ivScenario,
      );
      const strategyValue = roundMoney(perShareValue * 100);
      const netPnl = roundMoney(strategyValue - summary.totalCost);
      const returnPct =
        summary.totalCost > 0 ? roundPct((netPnl / summary.totalCost) * 100) : 0;
      row.push({
        exitDate,
        daysToExit: isExpiration ? 0 : daysToExit,
        underlyingPrice,
        strategyValue,
        netPnl,
        returnPct,
        isExpiration,
      });
    }
    cells.push(row);
  }

  return {
    ok: hardIssues.length === 0,
    inputs,
    legs: scaledLegs,
    summary,
    grid: {
      exitDates,
      underlyingPrices,
      cells,
      selectedCell: null,
    },
    hardIssues,
    softIssues,
  };
}

export type LegContractQuery = {
  type: "call" | "put";
  expiration: string;
  strike?: number;
  spot?: number;
};

export function listStrikesForLeg(
  contracts: OptionContractSnapshot[],
  query: Pick<LegContractQuery, "type" | "expiration">,
): number[] {
  const strikes = new Set<number>();
  for (const contract of contracts) {
    if (contract.type === query.type && contract.expiration === query.expiration) {
      strikes.add(contract.strike);
    }
  }
  return [...strikes].sort((a, b) => a - b);
}

export function findContractForLeg(
  contracts: OptionContractSnapshot[],
  query: Required<Pick<LegContractQuery, "type" | "expiration" | "strike">>,
): OptionContractSnapshot | undefined {
  const key = `${query.type}:${query.strike}:${query.expiration}`;
  for (const contract of contracts) {
    if (contractMapKey(contract) === key) return contract;
  }
  return undefined;
}

export function nearestChainStrike(
  contracts: OptionContractSnapshot[],
  query: LegContractQuery,
): number | null {
  const strikes = listStrikesForLeg(contracts, query);
  if (strikes.length === 0) return null;
  if (query.strike != null && strikes.includes(query.strike)) return query.strike;

  const spot = query.spot;
  if (spot == null || !Number.isFinite(spot)) {
    return strikes[Math.floor(strikes.length / 2)] ?? strikes[0] ?? null;
  }

  let best = strikes[0]!;
  let bestDistance = Math.abs(best - spot);
  for (const strike of strikes.slice(1)) {
    const distance = Math.abs(strike - spot);
    if (distance < bestDistance) {
      best = strike;
      bestDistance = distance;
    } else if (distance === bestDistance) {
      if (query.type === "call" && strike >= spot) best = strike;
      if (query.type === "put" && strike <= spot) best = strike;
    }
  }
  return best;
}

export function contractMapKey(contract: OptionContractSnapshot): string {
  return `${contract.type}:${contract.strike}:${contract.expiration}`;
}

export function buildContractMap(
  contracts: OptionContractSnapshot[],
): Map<string, OptionContractSnapshot> {
  const map = new Map<string, OptionContractSnapshot>();
  for (const contract of contracts) {
    map.set(contractMapKey(contract), contract);
  }
  return map;
}

export function legFromContract(
  contract: OptionContractSnapshot,
  action: "buy" | "sell" = "buy",
  quantity = 1,
): StrategyLegInput {
  return {
    id: contract.contractSymbol,
    action,
    type: contract.type,
    expiration: contract.expiration,
    strike: contract.strike,
    quantity,
    contractSymbol: contract.contractSymbol,
    impliedVolatility: contract.impliedVolatility ?? null,
  };
}

/** @deprecated Use resolveDollarRisk from riskSettings instead. */
export function defaultMaxRiskFromNetLiq(netLiq: number | null): number | null {
  if (netLiq == null || !Number.isFinite(netLiq) || netLiq <= 0) return null;
  return Math.round(netLiq * 0.01);
}
