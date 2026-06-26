/** Equity risk ruler — core data model (instrument-agnostic extension point). */

export type RiskDirection = 'long' | 'short';

export type StopType = 'initial' | 'breakeven' | 'trailing';

export interface RiskAccount {
  capital: number;
  riskPercent: number;
}

export interface RiskEntry {
  price: number;
  label?: string;
}

export interface RiskStop {
  price: number;
  type: StopType;
  label?: string;
}

export interface RiskTarget {
  price: number;
  rMultiple: number;
  allocationPercent?: number;
  label?: string;
}

export type OptionLegAction = 'buy' | 'sell';

export type OptionLegType = 'call' | 'put';

export interface OptionLeg {
  type: OptionLegType;
  action: OptionLegAction;
  strike: number;
  premium?: number;
  expiration?: string;
  label?: string;
}

export const OPTION_SETUP_TYPES = [
  'long_call',
  'bull_call_debit_spread',
  'bear_put_debit_spread',
  'iron_condor',
] as const;

export type OptionSetupType = (typeof OPTION_SETUP_TYPES)[number];

export type RiskInstrument = 'stock' | 'option';

export interface TradeSetup {
  direction: RiskDirection;
  account: RiskAccount;
  entries: RiskEntry[];
  stops: RiskStop[];
  targets: RiskTarget[];
  /** Present when created from an options preset. */
  instrument?: RiskInstrument;
  setupType?: OptionSetupType;
  legs?: OptionLeg[];
  symbol?: string;
  maxLoss?: number;
  maxProfit?: number;
  breakevens?: number[];
}

export interface TargetMetrics {
  index: number;
  price: number;
  rMultiple: number;
  allocationPercent: number;
  rewardPerShare: number;
  rewardDollars: number;
  label?: string;
}

export interface RiskMetrics {
  direction: RiskDirection;
  entryPrice: number;
  stopPrice: number;
  riskPerShare: number;
  positionSize: number;
  totalRiskDollars: number;
  accountRiskDollars: number;
  riskRewardRatio: number | null;
  targets: TargetMetrics[];
}

export const DEFAULT_RISK_ACCOUNT: RiskAccount = {
  capital: 50_000,
  riskPercent: 1,
};

export const DEFAULT_R_MULTIPLES = [1, 2, 3] as const;

/** Point role mapping for risk_ruler geometry (entry → stop → optional targets). */
export const RISK_RULER_POINT_ROLES = ['entry', 'stop', 'target'] as const;

export type RiskRulerPointRole = (typeof RISK_RULER_POINT_ROLES)[number];
