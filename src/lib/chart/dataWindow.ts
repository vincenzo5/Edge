import type { IndicatorConfig } from "@edge/chart-core/contracts";
import type { Candle, Theme } from "@edge/chart-core/contracts";
import type { CellConfig } from "@/lib/chartConfig";

export type DataWindowProps = {
  dataIndex: number | null;
  candles: Candle[];
  indicators: IndicatorConfig[];
  symbol: string;
  symbolName?: string;
  exchange?: string;
  interval: CellConfig["interval"];
  theme: Theme;
  chartSettings?: CellConfig["chartSettings"];
  mainSeriesVisible?: boolean;
  dataMeta?: {
    source: string;
    asOf?: number;
    stale?: boolean;
    warnings?: string[];
    streaming?: boolean;
    streamError?: string | null;
    lastUpdateAt?: number;
  } | null;
};
