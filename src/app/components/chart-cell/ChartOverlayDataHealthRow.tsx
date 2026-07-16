"use client";

import type { Theme } from "@/lib/chartConfig";
import { shouldShowTwsRecovery, twsRecoveryButtonLabel } from "@/lib/marketData/health";
import DataHealthButton from "../data-health/DataHealthButton";
import TwsRecoverButton from "../data-health/TwsRecoverButton";
import { useDataHealth } from "../data-health/DataHealthProvider";

type Props = {
  theme: Theme;
  marketSessionLabel?: string | null;
  showMarketStatus?: boolean;
};

/** Chart top-right row: inline reconnect + Data Health badge. */
export default function ChartOverlayDataHealthRow({
  theme,
  marketSessionLabel = null,
  showMarketStatus = true,
}: Props) {
  const { snapshot, recoveringTws, recoverMessage, recoverTws } = useDataHealth();
  const twsProvider = snapshot.providers.find((provider) => provider.id === "tws");
  const showTwsRecovery = shouldShowTwsRecovery(twsProvider);

  return (
    <div
      className="pointer-events-auto flex max-w-[18rem] flex-col items-end gap-1"
      data-testid="chart-overlay-status-row"
    >
      {showTwsRecovery ? (
        <div className="flex flex-col items-end gap-0.5">
          <TwsRecoverButton
            compact
            testId="chart-overlay-recover-tws"
            label={twsRecoveryButtonLabel(twsProvider)}
            recovering={recoveringTws}
            onClick={() => {
              void recoverTws();
            }}
          />
          {recoverMessage ? (
            <span
              className="max-w-[18rem] text-right text-[10px] text-[var(--edge-text-secondary)]"
              data-testid="chart-overlay-recover-message"
            >
              {recoverMessage}
            </span>
          ) : snapshot.connectionSummary ? (
            <span
              className="max-w-[18rem] text-right text-[10px] text-[var(--edge-negative)]"
              data-testid="chart-overlay-connection-summary"
            >
              {snapshot.connectionSummary}
            </span>
          ) : null}
        </div>
      ) : null}
      <DataHealthButton
        theme={theme}
        marketSessionLabel={marketSessionLabel}
        showMarketStatus={showMarketStatus}
      />
    </div>
  );
}
