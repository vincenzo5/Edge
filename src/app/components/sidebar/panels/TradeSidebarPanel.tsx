"use client";

import { useMemo } from "react";
import { useActiveChart } from "../../ActiveChartContext";
import { useQuote } from "@/lib/marketData/useQuotes";
import { resolveTradeTicketLastPrice } from "@/lib/trading/resolveTradeTicketLastPrice";
import { PanelPopOutButton } from "../PanelChromeActions";
import { TradeOrderForm } from "../../trading/TradeOrderForm";
import { useTradeSetupBinding } from "../../trading/TradeSetupBindingContext";
import { usePlaybookInstances } from "../../trading/usePlaybookInstances";
import { useAccountOptional } from "../../AccountProvider";

export function TradeSidebarPanel() {
  const { bind, levels, symbol: boundSymbol, seedQuantity, clearSeedQuantity } =
    useTradeSetupBinding();
  const activeChart = useActiveChart();
  const account = useAccountOptional();
  const accountId = account?.activeTradingAccountId ?? "";
  const { instances: playbookInstances, refresh: refreshPlaybookInstances } =
    usePlaybookInstances(accountId || null, { includePlanned: true });
  const symbol = boundSymbol ?? activeChart?.config.symbol ?? "";
  const quote = useQuote(symbol || null);
  const lastPrice = useMemo(() => {
    const candles =
      activeChart?.dataWindow?.candles ?? activeChart?.chartCommands?.getCandles?.() ?? [];
    return resolveTradeTicketLastPrice({
      quotePrice: quote?.regularMarketPrice,
      lastCandleClose: candles.at(-1)?.c ?? null,
    });
  }, [activeChart, quote]);

  const boundActive = bind != null && levels != null;

  const plannedInstance = useMemo(() => {
    if (!bind?.drawingId) return null;
    return (
      playbookInstances.find(
        (item) =>
          item.status === "planned" &&
          item.bindingRef?.kind === "drawing" &&
          item.bindingRef.id === bind.drawingId,
      ) ?? null
    );
  }, [bind?.drawingId, playbookInstances]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--edge-border)] px-3 py-2">
        <div>
          <div className="text-sm font-medium text-[var(--edge-text-strong)]">Trade</div>
          {bind ? (
            <div className="text-[10px] text-[var(--edge-text-secondary)]">
              Linked to position drawing
            </div>
          ) : (
            <div className="text-[10px] text-[var(--edge-text-secondary)]">
              Chart trade ticket
            </div>
          )}
        </div>
        <PanelPopOutButton label="Pop out" />
      </div>
      <TradeOrderForm
        symbol={symbol}
        planLevels={levels}
        lastPrice={lastPrice}
        boundActive={bind == null ? true : boundActive}
        seedQuantity={seedQuantity}
        onSeedQuantityApplied={clearSeedQuantity}
        plannedInstance={plannedInstance}
        onPlannedRefresh={() => void refreshPlaybookInstances()}
        testId="trade-sidebar-panel"
      />
    </div>
  );
}
