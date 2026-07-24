import { clearHeikinAshiCache } from "@edge/chart-core";
import { clearSharedClientTtlCache } from "./clientTtlCache";
import { clearChartClientCache } from "@/lib/chartDataFeed/chartClientCache";

/** Clear ephemeral in-memory market-data caches on session identity change / logout. */
export function clearEphemeralMarketDataCaches(): void {
  clearSharedClientTtlCache();
  clearChartClientCache();
  clearHeikinAshiCache();
}
