export type OptionType = "call" | "put";

export type OptionExpiration = {
  underlying: string;
  expiration: string;
  isWeekly?: boolean;
  isStandard?: boolean;
};

export type OptionContractSnapshot = {
  contractSymbol: string;
  underlying: string;
  type: OptionType;
  expiration: string;
  strike: number;
  bid?: number | null;
  ask?: number | null;
  last?: number | null;
  mark?: number | null;
  volume?: number | null;
  openInterest?: number | null;
  impliedVolatility?: number | null;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  rho?: number | null;
  updatedAt: number;
};

export type OptionsStrikeWindow =
  | { mode: "full" }
  | { mode: "atm"; count?: number; spot?: number };

export type OptionsChainRequest = {
  underlying: string;
  expiration?: string;
  strikeWindow?: OptionsStrikeWindow;
};

export type OptionsChainResponse = {
  underlying: string;
  expiration: string;
  contracts: OptionContractSnapshot[];
};
