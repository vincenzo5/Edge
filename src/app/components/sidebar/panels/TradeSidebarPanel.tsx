"use client";

import { useCallback, useMemo, useState } from "react";
import { useActiveChart } from "../../ActiveChartContext";
import { useQuote } from "@/lib/marketData/useQuotes";
import { resolveTradeTicketLastPrice } from "@/lib/trading/resolveTradeTicketLastPrice";
import { PanelPopOutButton } from "../PanelChromeActions";
import { TradeOrderForm } from "../../trading/TradeOrderForm";
import { useTradeSetupBinding } from "../../trading/TradeSetupBindingContext";
import { usePlaybookInstances } from "../../trading/usePlaybookInstances";
import { useAccountOptional } from "../../AccountProvider";
import { useRiskSettingsOptional } from "../../RiskSettingsProvider";
import { DEFAULT_RISK_SETTINGS } from "@/lib/risk/riskSettings";
import type { PolicyTradeDraftPatch } from "@/lib/risk/policy/applyPolicyToTradeDraft";
import {
  useTradePolicyApply,
  type TradePolicyFormContext,
} from "../../trading/useTradePolicyApply";

export function TradeSidebarPanel() {
  const { bind, levels, symbol: boundSymbol, seedQuantity, clearSeedQuantity } =
    useTradeSetupBinding();
  const activeChart = useActiveChart();
  const account = useAccountOptional();
  const riskSettings = useRiskSettingsOptional();
  const accountId = account?.activeTradingAccountId ?? "";
  const environment = account?.tradingEnvironment ?? "paper";
  const { instances: playbookInstances, refresh: refreshPlaybookInstances } =
    usePlaybookInstances(accountId || null, { includePlanned: true });
  const symbol = boundSymbol ?? activeChart?.config.symbol ?? "";
  const [policyFormContext, setPolicyFormContext] = useState<TradePolicyFormContext>({
    entryQty: 1,
    side: "BUY",
    entryPrice: null,
    existingStop: null,
  });
  const [policyDraftPatch, setPolicyDraftPatch] = useState<PolicyTradeDraftPatch | null>(
    null,
  );

  const entryQty = useMemo(() => {
    if (Number.isFinite(policyFormContext.entryQty) && policyFormContext.entryQty > 0) {
      return Math.round(policyFormContext.entryQty);
    }
    const seeded = seedQuantity;
    if (seeded != null && Number.isFinite(seeded) && seeded > 0) return Math.round(seeded);
    const planned = playbookInstances.find(
      (item) =>
        item.status === "planned" &&
        item.bindingRef?.kind === "drawing" &&
        item.bindingRef.id === bind?.drawingId,
    );
    if (planned?.positionPlan.qty) return planned.positionPlan.qty;
    return 1;
  }, [bind?.drawingId, playbookInstances, policyFormContext.entryQty, seedQuantity]);

  const onDraftApplied = useCallback((patch: PolicyTradeDraftPatch) => {
    setPolicyDraftPatch(patch);
  }, []);

  const policyApply = useTradePolicyApply({
    bind: bind?.drawingId ? { drawingId: bind.drawingId } : null,
    planLevels: levels,
    symbol,
    accountId,
    environment,
    entryQty,
    side: policyFormContext.side,
    entryPrice: policyFormContext.entryPrice,
    existingStop: policyFormContext.existingStop,
    dollarRisk: riskSettings?.dollarRisk ?? null,
    sessionSettings: riskSettings?.settings ?? DEFAULT_RISK_SETTINGS,
    accountBasisValue: riskSettings?.accountBasisValue ?? null,
    instances: playbookInstances,
    onInstancesChange: () => void refreshPlaybookInstances(),
    onDraftApplied,
  });
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

  const plannedInstance = policyApply.plannedInstance;

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
        policyTemplates={policyApply.templates}
        selectedPolicyId={policyApply.selectedTemplateId}
        onPolicyChange={(templateId) => void policyApply.applyPolicy(templateId)}
        policyLoading={policyApply.loading}
        policyApplyError={policyApply.error}
        policyPickerEnabled={Boolean(accountId.trim())}
        policyDraftPatch={policyDraftPatch}
        onPolicyDraftConsumed={() => setPolicyDraftPatch(null)}
        onPolicyFormContextChange={setPolicyFormContext}
        testId="trade-sidebar-panel"
      />
    </div>
  );
}
