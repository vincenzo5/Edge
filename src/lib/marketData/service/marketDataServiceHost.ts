import type { TwsStatusProbe } from "../providers/tws/client";
import type { IbkrProvider } from "../providers/ibkr/adapter";
import type { TwsProvider } from "../providers/tws/adapter";
import { createFmpProvider } from "../providers/fmp/adapter";
import { createFredProvider } from "../providers/fred/adapter";
import { createMassiveProvider } from "../providers/massive/adapter";
import { createSecProvider } from "../providers/sec/adapter";
import { createYahooProvider } from "../providers/yahoo/adapter";

/** Internal surface exposed to service route modules. */
export type MarketDataServiceHost = {
  yahoo: ReturnType<typeof createYahooProvider>;
  sec: ReturnType<typeof createSecProvider>;
  fred: ReturnType<typeof createFredProvider>;
  fmp: ReturnType<typeof createFmpProvider>;
  massive: ReturnType<typeof createMassiveProvider>;
  ibkr: IbkrProvider;
  tws: TwsProvider;
  candlesRevalidateKeys: Set<string>;
  quotesRevalidateKey: string | null;
  optionExpRevalidateKeys: Set<string>;
  optionsChainRevalidateKeys: Set<string>;
  twsGatewayProbeAt: number;
  twsGatewayConnected: boolean;
  lastTwsStatusProbe: TwsStatusProbe | null;
  lastTwsStatusObservedAt: number;
  ibkrAuthProbeAt: number;
  ibkrAuthenticated: boolean;
};
