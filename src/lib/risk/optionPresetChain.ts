import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import type { OptionLeg, OptionLegAction, OptionSetupType } from "@edge/chart-core";

export type OptionPresetSelection =
  | {
      ok: true;
      legs: OptionLeg[];
      contracts: OptionContractSnapshot[];
      pricingWarnings: string[];
    }
  | {
      ok: false;
      reason: string;
    };

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function sortedStrikes(contracts: OptionContractSnapshot[]): number[] {
  return [...new Set(contracts.map((contract) => contract.strike))].sort(
    (left, right) => left - right,
  );
}

function contractAt(
  contracts: OptionContractSnapshot[],
  type: "call" | "put",
  strike: number,
): OptionContractSnapshot | undefined {
  return contracts.find(
    (contract) => contract.type === type && contract.strike === strike,
  );
}

function nearestStrike(strikes: number[], spot: number): number | undefined {
  if (strikes.length === 0) return undefined;
  return strikes.reduce((best, strike) =>
    Math.abs(strike - spot) < Math.abs(best - spot) ? strike : best,
  );
}

function nextStrikeAbove(strikes: number[], reference: number): number | undefined {
  return strikes.find((strike) => strike > reference);
}

function nextStrikeBelow(strikes: number[], reference: number): number | undefined {
  for (let index = strikes.length - 1; index >= 0; index -= 1) {
    const strike = strikes[index]!;
    if (strike < reference) return strike;
  }
  return undefined;
}

function strikeNearPercent(
  strikes: number[],
  spot: number,
  percent: number,
  direction: "below" | "above",
  requireWing = false,
): number | undefined {
  const target = spot * (1 + (direction === "below" ? -percent : percent));
  const candidates =
    direction === "below"
      ? strikes.filter((strike) => strike < spot)
      : strikes.filter((strike) => strike > spot);
  if (candidates.length === 0) return undefined;

  const wingCandidates = requireWing
    ? candidates.filter((strike) =>
        direction === "below"
          ? nextStrikeBelow(strikes, strike) != null
          : nextStrikeAbove(strikes, strike) != null,
      )
    : candidates;
  const pool = wingCandidates.length > 0 ? wingCandidates : candidates;

  return pool.reduce((best, strike) =>
    Math.abs(strike - target) < Math.abs(best - target) ? strike : best,
  );
}

export function priceOptionLeg(
  contract: OptionContractSnapshot,
  action: OptionLegAction,
): { premium: number | null; warning?: string } {
  const pick = (value: number | null | undefined, source: string) => {
    if (value == null || !Number.isFinite(value) || value < 0) return null;
    return { premium: value, warning: source === "fallback" ? `Used ${source} price for ${contract.contractSymbol}` : undefined };
  };

  if (action === "buy") {
    if (contract.ask != null && Number.isFinite(contract.ask) && contract.ask >= 0) {
      return { premium: contract.ask };
    }
    if (contract.mark != null && Number.isFinite(contract.mark) && contract.mark >= 0) {
      return {
        premium: contract.mark,
        warning: `Used mark price for ${contract.contractSymbol}`,
      };
    }
    if (contract.last != null && Number.isFinite(contract.last) && contract.last >= 0) {
      return {
        premium: contract.last,
        warning: `Used last price for ${contract.contractSymbol}`,
      };
    }
    return { premium: null };
  }

  if (contract.bid != null && Number.isFinite(contract.bid) && contract.bid >= 0) {
    return { premium: contract.bid };
  }
  if (contract.mark != null && Number.isFinite(contract.mark) && contract.mark >= 0) {
    return {
      premium: contract.mark,
      warning: `Used mark price for ${contract.contractSymbol}`,
    };
  }
  if (contract.last != null && Number.isFinite(contract.last) && contract.last >= 0) {
    return {
      premium: contract.last,
      warning: `Used last price for ${contract.contractSymbol}`,
    };
  }
  return { premium: null };
}

function legFromContract(
  contract: OptionContractSnapshot,
  action: OptionLegAction,
  label: string,
): { leg: OptionLeg; warning?: string } | null {
  const priced = priceOptionLeg(contract, action);
  if (priced.premium == null) return null;
  return {
    leg: {
      type: contract.type,
      action,
      strike: contract.strike,
      premium: roundPrice(priced.premium),
      expiration: contract.expiration,
      label,
    },
    warning: priced.warning,
  };
}

function buildSelection(
  pairs: Array<{
    contract: OptionContractSnapshot | undefined;
    action: OptionLegAction;
    label: string;
  }>,
  missingReason: string,
): OptionPresetSelection {
  const legs: OptionLeg[] = [];
  const contracts: OptionContractSnapshot[] = [];
  const pricingWarnings: string[] = [];

  for (const pair of pairs) {
    if (!pair.contract) {
      return { ok: false, reason: missingReason };
    }
    const built = legFromContract(pair.contract, pair.action, pair.label);
    if (!built) {
      return {
        ok: false,
        reason: `Missing quote for ${pair.label.toLowerCase()} (${pair.contract.strike}${pair.contract.type === "call" ? "C" : "P"})`,
      };
    }
    legs.push(built.leg);
    contracts.push(pair.contract);
    if (built.warning) pricingWarnings.push(built.warning);
  }

  return { ok: true, legs, contracts, pricingWarnings };
}

export function selectOptionPresetContracts(
  setupType: OptionSetupType,
  contracts: OptionContractSnapshot[],
  spotPrice: number,
): OptionPresetSelection {
  if (!Number.isFinite(spotPrice) || spotPrice <= 0) {
    return { ok: false, reason: "Spot price unavailable" };
  }
  if (contracts.length === 0) {
    return { ok: false, reason: "Options chain not loaded" };
  }

  const strikes = sortedStrikes(contracts);
  const atmStrike = nearestStrike(strikes, spotPrice);
  if (atmStrike == null) {
    return { ok: false, reason: "No strikes available" };
  }

  switch (setupType) {
    case "long_call": {
      const call = contractAt(contracts, "call", atmStrike);
      return buildSelection(
        [{ contract: call, action: "buy", label: "Long call" }],
        "ATM call not available",
      );
    }
    case "bull_call_debit_spread": {
      const longStrike =
        strikes.filter((strike) => strike <= spotPrice).reduce<number | undefined>(
          (best, strike) =>
            best == null || Math.abs(strike - spotPrice) < Math.abs(best - spotPrice)
              ? strike
              : best,
          undefined,
        ) ?? atmStrike;
      const shortStrike =
        nextStrikeAbove(strikes, longStrike) ??
        strikeNearPercent(strikes, spotPrice, 0.05, "above");
      return buildSelection(
        [
          {
            contract: contractAt(contracts, "call", longStrike),
            action: "buy",
            label: "Long call",
          },
          {
            contract: contractAt(contracts, "call", shortStrike ?? -1),
            action: "sell",
            label: "Short call",
          },
        ],
        "Need two call strikes for bull call spread",
      );
    }
    case "bear_put_debit_spread": {
      const longStrike =
        strikes.filter((strike) => strike >= spotPrice).reduce<number | undefined>(
          (best, strike) =>
            best == null || Math.abs(strike - spotPrice) < Math.abs(best - spotPrice)
              ? strike
              : best,
          undefined,
        ) ?? atmStrike;
      const shortStrike =
        nextStrikeBelow(strikes, longStrike) ??
        strikeNearPercent(strikes, spotPrice, 0.05, "below");
      return buildSelection(
        [
          {
            contract: contractAt(contracts, "put", longStrike),
            action: "buy",
            label: "Long put",
          },
          {
            contract: contractAt(contracts, "put", shortStrike ?? -1),
            action: "sell",
            label: "Short put",
          },
        ],
        "Need two put strikes for bear put spread",
      );
    }
    case "iron_condor": {
      const shortPutStrike =
        strikeNearPercent(strikes, spotPrice, 0.05, "below", true) ??
        nextStrikeBelow(strikes, atmStrike);
      const shortCallStrike =
        strikeNearPercent(strikes, spotPrice, 0.05, "above", true) ??
        nextStrikeAbove(strikes, atmStrike);
      if (shortPutStrike == null || shortCallStrike == null) {
        return { ok: false, reason: "Need OTM put and call strikes for iron condor" };
      }
      const longPutStrike = nextStrikeBelow(strikes, shortPutStrike);
      const longCallStrike = nextStrikeAbove(strikes, shortCallStrike);
      return buildSelection(
        [
          {
            contract: contractAt(contracts, "put", shortPutStrike),
            action: "sell",
            label: "Short put",
          },
          {
            contract: contractAt(contracts, "put", longPutStrike ?? -1),
            action: "buy",
            label: "Long put",
          },
          {
            contract: contractAt(contracts, "call", shortCallStrike),
            action: "sell",
            label: "Short call",
          },
          {
            contract: contractAt(contracts, "call", longCallStrike ?? -1),
            action: "buy",
            label: "Long call",
          },
        ],
        "Need four strikes for iron condor",
      );
    }
  }
}

export function formatOptionLegPreview(leg: OptionLeg): string {
  const action = leg.action === "buy" ? "Buy" : "Sell";
  const type = leg.type === "call" ? "C" : "P";
  const premium =
    leg.premium != null ? ` @ ${leg.premium.toFixed(2)}` : "";
  return `${action} ${leg.strike}${type}${premium}`;
}

export function getOptionPresetSelectionStatus(
  setupType: OptionSetupType,
  contracts: OptionContractSnapshot[],
  spotPrice: number,
): { ok: true; preview: string } | { ok: false; reason: string } {
  const selection = selectOptionPresetContracts(setupType, contracts, spotPrice);
  if (!selection.ok) {
    return { ok: false, reason: selection.reason };
  }
  return {
    ok: true,
    preview: selection.legs.map(formatOptionLegPreview).join(" · "),
  };
}
