"use client";

import { useMemo } from "react";
import { useActiveChart } from "../../ActiveChartContext";
import { useMarketDataQuotes } from "../../MarketDataProvider";
import { PanelPopOutButton } from "../PanelChromeActions";
import { TradeOrderForm } from "../../trading/TradeOrderForm";
import { useTradeSetupBinding } from "../../trading/TradeSetupBindingContext";

export function TradeSidebarPanel() {
  const { bind, levels, symbol: boundSymbol } = useTradeSetupBinding();
  const activeChart = useActiveChart();
  const marketData = useMarketDataQuotes();

  const symbol = boundSymbol ?? activeChart?.config.symbol ?? "";
  const lastPrice = useMemo(() => {
    if (!symbol || !marketData) return null;
    const quote = marketData.quotesBySymbol.get(symbol.trim().toUpperCase());
    const price = quote?.regularMarketPrice;
    return price != null && Number.isFinite(price) ? price : null;
  }, [marketData, symbol]);

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
        testId="trade-sidebar-panel"
      />
    </div>
  );
}
