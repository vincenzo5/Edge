"use client";

import { useMemo } from "react";
import { useActiveChart } from "../../ActiveChartContext";
import { useQuote } from "@/lib/marketData/useQuotes";
import { PanelPopOutButton } from "../PanelChromeActions";
import { TradeOrderForm } from "../../trading/TradeOrderForm";
import { useTradeSetupBinding } from "../../trading/TradeSetupBindingContext";

export function TradeSidebarPanel() {
  const { bind, levels, symbol: boundSymbol, seedQuantity, clearSeedQuantity } =
    useTradeSetupBinding();
  const activeChart = useActiveChart();
  const symbol = boundSymbol ?? activeChart?.config.symbol ?? "";
  const quote = useQuote(symbol || null);
  const lastPrice = useMemo(() => {
    const price = quote?.regularMarketPrice;
    return price != null && Number.isFinite(price) ? price : null;
  }, [quote]);

  const boundActive = bind != null && levels != null;

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
        testId="trade-sidebar-panel"
      />
    </div>
  );
}
