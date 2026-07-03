import type {
  MassiveOptionChainSnapshot,
  MassiveOptionReferenceContract,
} from "../../../contracts/massive";

export const massiveReferenceRows: MassiveOptionReferenceContract[] = [
  {
    ticker: "O:AAPL250620C00150000",
    underlying_ticker: "AAPL",
    expiration_date: "2025-06-20",
    contract_type: "call",
    strike_price: 150,
  },
  {
    ticker: "O:AAPL250620P00150000",
    underlying_ticker: "AAPL",
    expiration_date: "2025-06-20",
    contract_type: "put",
    strike_price: 150,
  },
  {
    ticker: "O:AAPL250620C00155000",
    underlying_ticker: "AAPL",
    expiration_date: "2025-06-20",
    contract_type: "call",
    strike_price: 155,
  },
];

export const massiveSnapshotRow: MassiveOptionChainSnapshot = {
  details: {
    ticker: "O:AAPL250620C00150000",
    contract_type: "call",
    expiration_date: "2025-06-20",
    strike_price: 150,
  },
  last_quote: {
    bid: 1.1,
    ask: 1.2,
    midpoint: 1.15,
    last_updated: 1_700_000_000_000_000_000,
  },
  last_trade: { price: 1.14, sip_timestamp: 1_700_000_000_100_000 },
  day: { volume: 1200, close: 1.13, last_updated: 1_700_000_000_200_000 },
  open_interest: 4500,
  implied_volatility: 0.28,
  greeks: { delta: 0.55, gamma: 0.02, theta: -0.04, vega: 0.12 },
};

export const massiveSnapshotWithoutGreeks: MassiveOptionChainSnapshot = {
  details: {
    ticker: "O:AAPL250620P00150000",
    contract_type: "put",
    expiration_date: "2025-06-20",
    strike_price: 150,
  },
  last_quote: { bid: 0.9, ask: 1.0, last_updated: 1_700_000_000_000_000 },
  open_interest: 900,
};
