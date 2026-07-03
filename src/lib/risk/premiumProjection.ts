import { z } from "zod";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import type { StrikeRow } from "@/lib/options/optionsClient";
import { priceOptionLeg } from "./optionPresetChain";

export type Direction = "bullish" | "bearish";

export const MIN_OPTION_VOLUME = 10;
export const MAX_BID_ASK_SPREAD_RATIO = 0.15;

export const CalculatorInputsSchema = z.object({
  direction: z.enum(["bullish", "bearish"]),
  spotPrice: z.number().positive().finite(),
  target: z.number().positive().finite(),
  stop: z.number().positive().finite(),
  maxRisk: z.number().positive().max(1_000_000).finite(),
  maxHoldDays: z.number().int().min(1).max(30),
  expiration: z.string().min(1),
});

export type CalculatorInputs = z.infer<typeof CalculatorInputsSchema>;

export type ValidationSeverity = "hard" | "soft";

export type InputValidationIssue = {
  field?: keyof CalculatorInputs | "general";
  message: string;
  severity: ValidationSeverity;
};

export type StrikeEvaluation = {
  strike: number;
  premium: number;
  premiumAtTarget: number;
  profit: number;
  ratio: number;
  delta: number | null;
  volume: number | null;
  bidAskSpread: number | null;
  liquidityOk: boolean;
  fitsRiskBudget: boolean;
  deltaEstimate: boolean;
};

export type ThreeStrikes = {
  atm: number;
  halfway: number;
  target: number;
};

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

function contractPremium(contract: OptionContractSnapshot): number | null {
  return priceOptionLeg(contract, "buy").premium;
}

function bidAskSpread(contract: OptionContractSnapshot): number | null {
  const { bid, ask } = contract;
  if (
    bid == null ||
    ask == null ||
    !Number.isFinite(bid) ||
    !Number.isFinite(ask) ||
    ask < bid
  ) {
    return null;
  }
  return roundPrice(ask - bid);
}

function midPrice(contract: OptionContractSnapshot): number | null {
  const { bid, ask, mark, last } = contract;
  if (bid != null && ask != null && Number.isFinite(bid) && Number.isFinite(ask)) {
    return (bid + ask) / 2;
  }
  if (mark != null && Number.isFinite(mark)) return mark;
  if (last != null && Number.isFinite(last)) return last;
  return contractPremium(contract);
}

export function isLiquidityOk(
  contract: OptionContractSnapshot,
  minVolume = MIN_OPTION_VOLUME,
  maxSpreadRatio = MAX_BID_ASK_SPREAD_RATIO,
): boolean {
  const volume = contract.volume;
  if (volume == null || !Number.isFinite(volume) || volume < minVolume) {
    return false;
  }
  const spread = bidAskSpread(contract);
  const mid = midPrice(contract);
  if (spread == null || mid == null || mid <= 0) return false;
  return spread / mid <= maxSpreadRatio;
}

export function estimatePremiumAtTarget(
  contract: OptionContractSnapshot,
  spot: number,
  target: number,
  direction: Direction,
): { premiumAtTarget: number; deltaEstimate: boolean } {
  const premium = contractPremium(contract);
  if (premium == null) {
    return { premiumAtTarget: 0, deltaEstimate: false };
  }

  const delta = contract.delta;
  if (delta == null || !Number.isFinite(delta)) {
    return { premiumAtTarget: premium, deltaEstimate: false };
  }

  let projected: number;
  if (direction === "bullish") {
    projected = premium + delta * (target - spot);
  } else {
    projected = premium + Math.abs(delta) * (spot - target);
  }

  return {
    premiumAtTarget: roundPrice(Math.max(0, projected)),
    deltaEstimate: true,
  };
}

function availableStrikes(rows: StrikeRow[], direction: Direction): number[] {
  return rows
    .filter((row) => {
      const leg = direction === "bullish" ? row.call : row.put;
      return leg != null && contractPremium(leg) != null;
    })
    .map((row) => row.strike)
    .sort((a, b) => a - b);
}

function nearestStrike(strikes: number[], price: number): number | undefined {
  if (strikes.length === 0) return undefined;
  return strikes.reduce((best, strike) =>
    Math.abs(strike - price) < Math.abs(best - price) ? strike : best,
  );
}

export function selectThreeStrikes(
  strikeRows: StrikeRow[],
  spot: number,
  target: number,
  direction: Direction,
): ThreeStrikes | null {
  const strikes = availableStrikes(strikeRows, direction);
  if (strikes.length < 3) return null;

  const atm = nearestStrike(strikes, spot);
  if (atm == null) return null;

  const withoutAtm = strikes.filter((strike) => strike !== atm);
  const targetStrike = nearestStrike(withoutAtm, target);
  if (targetStrike == null) return null;

  const withoutAtmAndTarget = withoutAtm.filter((strike) => strike !== targetStrike);
  const halfwayPrice = (spot + target) / 2;
  const halfway = nearestStrike(withoutAtmAndTarget, halfwayPrice);
  if (halfway == null) return null;

  return { atm, halfway, target: targetStrike };
}

export function computeStrikeEvaluation(
  row: StrikeRow,
  direction: Direction,
  spot: number,
  target: number,
  maxRisk: number,
): StrikeEvaluation | null {
  const contract = direction === "bullish" ? row.call : row.put;
  if (!contract) return null;

  const premium = contractPremium(contract);
  if (premium == null || premium <= 0) return null;

  const { premiumAtTarget, deltaEstimate } = estimatePremiumAtTarget(
    contract,
    spot,
    target,
    direction,
  );
  const profit = roundPrice(premiumAtTarget - premium);
  const ratio = premium > 0 ? roundRatio(profit / premium) : 0;
  const perContractCost = premium * 100;

  return {
    strike: row.strike,
    premium: roundPrice(premium),
    premiumAtTarget,
    profit,
    ratio,
    delta: contract.delta ?? null,
    volume: contract.volume ?? null,
    bidAskSpread: bidAskSpread(contract),
    liquidityOk: isLiquidityOk(contract),
    fitsRiskBudget: perContractCost <= maxRisk,
    deltaEstimate,
  };
}

export function evaluateThreeStrikes(
  strikeRows: StrikeRow[],
  three: ThreeStrikes,
  direction: Direction,
  spot: number,
  target: number,
  maxRisk: number,
): StrikeEvaluation[] {
  const strikeSet = new Set([three.atm, three.halfway, three.target]);
  const evaluations: StrikeEvaluation[] = [];

  for (const row of strikeRows) {
    if (!strikeSet.has(row.strike)) continue;
    const evaluation = computeStrikeEvaluation(row, direction, spot, target, maxRisk);
    if (evaluation) evaluations.push(evaluation);
  }

  return evaluations.sort((a, b) => b.ratio - a.ratio);
}

export function pickWinner(evaluations: StrikeEvaluation[]): StrikeEvaluation | null {
  const eligible = evaluations.filter(
    (row) => row.liquidityOk && row.fitsRiskBudget && row.ratio > 0,
  );
  if (eligible.length === 0) return null;
  return [...eligible].sort((a, b) => b.ratio - a.ratio)[0] ?? null;
}

export function sizeContracts(maxRisk: number, premiumPerShare: number): number {
  if (!Number.isFinite(maxRisk) || !Number.isFinite(premiumPerShare) || premiumPerShare <= 0) {
    return 0;
  }
  return Math.floor(maxRisk / (premiumPerShare * 100));
}

function daysFromToday(expiration: string, now = new Date()): number | null {
  const expMs = Date.parse(`${expiration}T16:00:00.000Z`);
  if (!Number.isFinite(expMs)) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const expDay = new Date(expMs);
  expDay.setHours(0, 0, 0, 0);
  return Math.round((expDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function filterExpirationsForHold(
  expirations: string[],
  maxHoldDays: number,
  now = new Date(),
): string[] {
  const minDays = maxHoldDays;
  const maxDays = maxHoldDays * 2;
  return expirations.filter((expiration) => {
    const days = daysFromToday(expiration, now);
    if (days == null) return false;
    return days > minDays && days <= maxDays;
  });
}

export function validateCalculatorInputs(
  inputs: unknown,
  now = new Date(),
): {
  ok: boolean;
  data: CalculatorInputs | null;
  hardIssues: InputValidationIssue[];
  softIssues: InputValidationIssue[];
} {
  const parsed = CalculatorInputsSchema.safeParse(inputs);
  if (!parsed.success) {
    const hardIssues: InputValidationIssue[] = parsed.error.issues.map((issue) => ({
      field: issue.path[0] as keyof CalculatorInputs | undefined,
      message: issue.message,
      severity: "hard" as const,
    }));
    return { ok: false, data: null, hardIssues, softIssues: [] };
  }

  const data = parsed.data;
  const hardIssues: InputValidationIssue[] = [];
  const softIssues: InputValidationIssue[] = [];
  const { direction, spotPrice, target, stop, maxHoldDays, expiration } = data;

  if (target === stop) {
    hardIssues.push({
      field: "general",
      message: "Target and stop cannot be equal.",
      severity: "hard",
    });
  }

  if (direction === "bullish") {
    if (stop >= spotPrice) {
      hardIssues.push({
        field: "stop",
        message: "Stop must be below current price for a long call.",
        severity: "hard",
      });
    }
    if (target <= spotPrice) {
      hardIssues.push({
        field: "target",
        message: "Target must be above current price for a long call.",
        severity: "hard",
      });
    }
  } else {
    if (stop <= spotPrice) {
      hardIssues.push({
        field: "stop",
        message: "Stop must be above current price for a long put.",
        severity: "hard",
      });
    }
    if (target >= spotPrice) {
      hardIssues.push({
        field: "target",
        message: "Target must be below current price for a long put.",
        severity: "hard",
      });
    }
  }

  const expDays = daysFromToday(expiration, now);
  if (expDays != null) {
    if (expDays <= maxHoldDays) {
      hardIssues.push({
        field: "expiration",
        message: "Expiration must be after your max hold window.",
        severity: "hard",
      });
    }
    if (expDays > maxHoldDays * 2) {
      softIssues.push({
        field: "expiration",
        message: "Expiration is > 2× hold window — premium may be larger than needed.",
        severity: "soft",
      });
    }
  }

  const movePct = Math.abs(target - spotPrice) / spotPrice;
  if (movePct > 0.2) {
    softIssues.push({
      field: "target",
      message: "Target is > 20% from spot — delta estimate loses accuracy.",
      severity: "soft",
    });
  }

  return {
    ok: hardIssues.length === 0,
    data,
    hardIssues,
    softIssues,
  };
}

export function defaultMaxRiskFromNetLiq(netLiq: number | null): number | null {
  if (netLiq == null || !Number.isFinite(netLiq) || netLiq <= 0) return null;
  return Math.round(netLiq * 0.01);
}
