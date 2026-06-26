import type { SerializedDrawing } from "@/lib/chartConfig";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  computeRiskMetrics,
  DEFAULT_RISK_ACCOUNT,
  formatOptionSetupExplanation,
  riskComputedPayload,
  targetPriceForRMultiple,
  validateTradeSetup,
  type OptionLeg,
  type OptionSetupType,
  type RiskTarget,
  type TradeSetup,
} from "@edge/chart-core";
import {
  selectOptionPresetContracts,
  type OptionPresetSelection,
} from "./optionPresetChain";

export type RiskRulerPresetInput = {
  setupType: OptionSetupType;
  spotPrice: number;
  symbol: string;
  timestamp?: number;
  dataIndex?: number;
  expiration?: string;
  contracts?: OptionContractSnapshot[];
  pricingWarnings?: string[];
};

export const OPTION_SETUP_LABELS: Record<OptionSetupType, string> = {
  long_call: "Long Call",
  bull_call_debit_spread: "Bull Call Spread",
  bear_put_debit_spread: "Bear Put Spread",
  iron_condor: "Iron Condor",
};

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function rMultipleFor(entry: number, stop: number, target: number): number {
  const riskDistance = Math.abs(entry - stop);
  if (riskDistance <= 0) return 1;
  return Math.abs(target - entry) / riskDistance;
}

function targetAt(
  entry: number,
  stop: number,
  price: number,
  label: string,
): RiskTarget {
  return {
    price: roundPrice(price),
    rMultiple: rMultipleFor(entry, stop, price),
    label,
  };
}

function netDebit(legs: OptionLeg[]): number {
  return roundPrice(
    legs.reduce((total, leg) => {
      const premium = leg.premium ?? 0;
      return leg.action === "buy" ? total + premium : total - premium;
    }, 0),
  );
}

function netCredit(legs: OptionLeg[]): number {
  return roundPrice(
    legs.reduce((total, leg) => {
      const premium = leg.premium ?? 0;
      return leg.action === "sell" ? total + premium : total - premium;
    }, 0),
  );
}

function buildLegs(
  setupType: OptionSetupType,
  spot: number,
  expiration?: string,
): OptionLeg[] {
  const exp = expiration ? { expiration } : {};
  switch (setupType) {
    case "long_call":
      return [
        {
          type: "call",
          action: "buy",
          strike: roundPrice(spot),
          premium: roundPrice(spot * 0.02),
          label: "Long call",
          ...exp,
        },
      ];
    case "bull_call_debit_spread":
      return [
        {
          type: "call",
          action: "buy",
          strike: roundPrice(spot),
          premium: roundPrice(spot * 0.025),
          label: "Long call",
          ...exp,
        },
        {
          type: "call",
          action: "sell",
          strike: roundPrice(spot * 1.05),
          premium: roundPrice(spot * 0.01),
          label: "Short call",
          ...exp,
        },
      ];
    case "bear_put_debit_spread":
      return [
        {
          type: "put",
          action: "buy",
          strike: roundPrice(spot),
          premium: roundPrice(spot * 0.025),
          label: "Long put",
          ...exp,
        },
        {
          type: "put",
          action: "sell",
          strike: roundPrice(spot * 0.95),
          premium: roundPrice(spot * 0.01),
          label: "Short put",
          ...exp,
        },
      ];
    case "iron_condor":
      return [
        {
          type: "put",
          action: "sell",
          strike: roundPrice(spot * 0.95),
          label: "Short put",
          ...exp,
        },
        {
          type: "put",
          action: "buy",
          strike: roundPrice(spot * 0.9),
          label: "Long put",
          ...exp,
        },
        {
          type: "call",
          action: "sell",
          strike: roundPrice(spot * 1.05),
          label: "Short call",
          ...exp,
        },
        {
          type: "call",
          action: "buy",
          strike: roundPrice(spot * 1.1),
          label: "Long call",
          ...exp,
        },
      ];
  }
}

function buildSetupFromLegs(
  setupType: OptionSetupType,
  symbol: string,
  spot: number,
  legs: OptionLeg[],
): TradeSetup | null {
  const entry = spot;

  switch (setupType) {
    case "long_call": {
      const longCall = legs[0];
      if (!longCall?.premium) return null;
      const debit = longCall.premium;
      const stop = roundPrice(spot - debit);
      const direction = "long" as const;
      const targets: RiskTarget[] = [1, 2, 3].map((rMultiple) => ({
        price: targetPriceForRMultiple(entry, stop, direction, rMultiple),
        rMultiple,
      }));
      return {
        direction,
        account: DEFAULT_RISK_ACCOUNT,
        entries: [{ price: entry, label: "Entry" }],
        stops: [{ price: stop, type: "initial", label: "Max loss zone" }],
        targets,
        instrument: "option",
        setupType,
        legs,
        symbol,
        maxLoss: debit,
        maxProfit: undefined,
        breakevens: [roundPrice(longCall.strike + debit)],
      };
    }
    case "bull_call_debit_spread": {
      const longCall = legs.find((leg) => leg.action === "buy" && leg.type === "call");
      const shortCall = legs.find((leg) => leg.action === "sell" && leg.type === "call");
      if (!longCall || !shortCall) return null;
      const debit = netDebit(legs);
      if (debit <= 0) return null;
      const stop = roundPrice(longCall.strike - debit);
      const maxProfit = roundPrice(shortCall.strike - longCall.strike - debit);
      return {
        direction: "long",
        account: DEFAULT_RISK_ACCOUNT,
        entries: [{ price: entry, label: "Entry" }],
        stops: [{ price: stop, type: "initial", label: "Max loss" }],
        targets: [
          targetAt(entry, stop, longCall.strike + debit, "Breakeven"),
          targetAt(entry, stop, shortCall.strike, "Max profit"),
        ],
        instrument: "option",
        setupType,
        legs,
        symbol,
        maxLoss: debit,
        maxProfit,
        breakevens: [roundPrice(longCall.strike + debit)],
      };
    }
    case "bear_put_debit_spread": {
      const longPut = legs.find((leg) => leg.action === "buy" && leg.type === "put");
      const shortPut = legs.find((leg) => leg.action === "sell" && leg.type === "put");
      if (!longPut || !shortPut) return null;
      const debit = netDebit(legs);
      if (debit <= 0) return null;
      const stop = roundPrice(longPut.strike + debit);
      const maxProfit = roundPrice(longPut.strike - shortPut.strike - debit);
      return {
        direction: "short",
        account: DEFAULT_RISK_ACCOUNT,
        entries: [{ price: entry, label: "Entry" }],
        stops: [{ price: stop, type: "initial", label: "Max loss" }],
        targets: [
          targetAt(entry, stop, longPut.strike - debit, "Breakeven"),
          targetAt(entry, stop, shortPut.strike, "Max profit"),
        ],
        instrument: "option",
        setupType,
        legs,
        symbol,
        maxLoss: debit,
        maxProfit,
        breakevens: [roundPrice(longPut.strike - debit)],
      };
    }
    case "iron_condor": {
      const shortPut = legs.find((leg) => leg.action === "sell" && leg.type === "put");
      const longPut = legs.find((leg) => leg.action === "buy" && leg.type === "put");
      const shortCall = legs.find((leg) => leg.action === "sell" && leg.type === "call");
      const longCall = legs.find((leg) => leg.action === "buy" && leg.type === "call");
      if (!shortPut || !longPut || !shortCall || !longCall) return null;
      const credit = netCredit(legs);
      if (credit <= 0) return null;
      const putWingWidth = roundPrice(shortPut.strike - longPut.strike);
      const callWingWidth = roundPrice(longCall.strike - shortCall.strike);
      const wingWidth = Math.max(putWingWidth, callWingWidth);
      const stop = longPut.strike;
      return {
        direction: "long",
        account: DEFAULT_RISK_ACCOUNT,
        entries: [{ price: entry, label: "Entry" }],
        stops: [{ price: stop, type: "initial", label: "Max loss wing" }],
        targets: [
          targetAt(entry, stop, shortPut.strike, "Lower short"),
          targetAt(entry, stop, spot, "Max profit"),
          targetAt(entry, stop, shortCall.strike, "Upper short"),
        ],
        instrument: "option",
        setupType,
        legs,
        symbol,
        maxLoss: roundPrice(wingWidth - credit),
        maxProfit: credit,
        breakevens: [
          roundPrice(shortPut.strike - credit),
          roundPrice(shortCall.strike + credit),
        ],
      };
    }
  }
}

export function buildOptionTradeSetupFromContracts(
  input: RiskRulerPresetInput,
): { setup: TradeSetup; pricingWarnings: string[] } | null {
  const { setupType, spotPrice, symbol, contracts } = input;
  if (!contracts?.length || !Number.isFinite(spotPrice) || spotPrice <= 0) {
    return null;
  }

  const selection: OptionPresetSelection = selectOptionPresetContracts(
    setupType,
    contracts,
    spotPrice,
  );
  if (!selection.ok) return null;

  const setup = buildSetupFromLegs(
    setupType,
    symbol,
    roundPrice(spotPrice),
    selection.legs,
  );
  if (!setup) return null;

  return {
    setup,
    pricingWarnings: [...selection.pricingWarnings, ...(input.pricingWarnings ?? [])],
  };
}

function buildOptionTradeSetupFromSpot(input: RiskRulerPresetInput): TradeSetup | null {
  const { setupType, spotPrice, symbol, expiration } = input;
  if (!Number.isFinite(spotPrice) || spotPrice <= 0) return null;

  const spot = roundPrice(spotPrice);
  const legs = buildLegs(setupType, spot, expiration);
  return buildSetupFromLegs(setupType, symbol, spot, legs);
}

export function buildOptionTradeSetup(input: RiskRulerPresetInput): TradeSetup | null {
  const fromContracts = buildOptionTradeSetupFromContracts(input);
  if (fromContracts) return fromContracts.setup;
  return buildOptionTradeSetupFromSpot(input);
}

export function optionPresetTooltip(setupType: OptionSetupType): string {
  const setup = buildOptionTradeSetup({
    setupType,
    spotPrice: 100,
    symbol: "SYM",
  });
  if (!setup) return OPTION_SETUP_LABELS[setupType];
  return formatOptionSetupExplanation(setup).join(" ");
}

export function riskRulerPresetDrawingId(
  setupType: OptionSetupType,
  symbol: string,
): string {
  return `risk-ruler-${symbol}-${setupType}`;
}

export function buildRiskRulerPreset(input: RiskRulerPresetInput): SerializedDrawing | null {
  const fromContracts = buildOptionTradeSetupFromContracts(input);
  const setup = fromContracts?.setup ?? buildOptionTradeSetupFromSpot(input);
  if (!setup) return null;

  let validated: TradeSetup;
  try {
    validated = validateTradeSetup(setup);
  } catch {
    return null;
  }

  const metrics = computeRiskMetrics(validated);
  const timestamp = input.timestamp ?? Date.now();
  const dataIndex = input.dataIndex ?? 0;
  const entry = validated.entries[0]!.price;
  const stop = validated.stops[0]!.price;
  const pricingWarnings = fromContracts?.pricingWarnings ?? [];

  const points = [
    { timestamp, value: entry, dataIndex },
    { timestamp, value: stop, dataIndex },
    ...validated.targets.map((target) => ({
      timestamp,
      value: target.price,
      dataIndex,
    })),
  ];

  const label = `${OPTION_SETUP_LABELS[input.setupType]} · ${input.symbol}`;
  const optionExplanation = formatOptionSetupExplanation(validated);

  return {
    id: riskRulerPresetDrawingId(input.setupType, input.symbol),
    name: "risk_ruler",
    label,
    points,
    visible: true,
    locked: false,
    zLevel: 0,
    paneId: "price",
    metadata: {
      kind: "thesis",
      source: "user",
      fields: {
        riskSetup: validated,
        optionExplanation,
        ...(pricingWarnings.length > 0 ? { pricingWarnings } : {}),
      },
      computed: {
        ...riskComputedPayload(metrics),
        instrument: "option",
        setupType: input.setupType,
        chainDerived: fromContracts != null,
      },
    },
  };
}

export function addRiskRulerPreset(
  drawings: SerializedDrawing[],
  input: RiskRulerPresetInput,
): SerializedDrawing[] {
  const drawing = buildRiskRulerPreset(input);
  if (!drawing) return drawings;

  const withoutExisting = drawings.filter((item) => item.id !== drawing.id);
  return [...withoutExisting, drawing];
}

export { getOptionPresetSelectionStatus } from "./optionPresetChain";
