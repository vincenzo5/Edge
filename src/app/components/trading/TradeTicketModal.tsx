"use client";

import { useCallback, useMemo, useState } from "react";
import { EdgeModalShell } from "../design-system";
import { TradeOrderForm } from "./TradeOrderForm";
import { useTradePolicyApply, type TradePolicyFormContext } from "./useTradePolicyApply";
import { useAccountOptional } from "../AccountProvider";
import { useRiskSettingsOptional } from "../RiskSettingsProvider";
import { usePlaybookInstances } from "./usePlaybookInstances";
import type { PolicyTradeDraftPatch } from "@/lib/risk/policy/applyPolicyToTradeDraft";

type Props = {
  open: boolean;
  symbol: string;
  theme?: "dark" | "light";
  initialLimitPrice?: number | null;
  onClose: () => void;
};

/** Modal wrapper retained for tests; primary trade UX is the Trade sidebar panel. */
export default function TradeTicketModal({
  open,
  symbol,
  theme = "dark",
  initialLimitPrice,
  onClose,
}: Props) {
  const account = useAccountOptional();
  const riskSettings = useRiskSettingsOptional();
  const accountId = account?.activeTradingAccountId ?? "";
  const environment = account?.tradingEnvironment ?? "paper";
  const { instances: playbookInstances, refresh: refreshPlaybookInstances } =
    usePlaybookInstances(accountId || null, { includePlanned: true });

  const [policyFormContext, setPolicyFormContext] = useState<TradePolicyFormContext>({
    entryQty: 1,
    side: "BUY",
    entryPrice: initialLimitPrice ?? null,
    existingStop: null,
  });
  const [policyDraftPatch, setPolicyDraftPatch] = useState<PolicyTradeDraftPatch | null>(
    null,
  );

  const planLevels =
    initialLimitPrice != null && Number.isFinite(initialLimitPrice)
      ? {
          direction: "long" as const,
          side: "BUY" as const,
          entry: initialLimitPrice,
          stop: initialLimitPrice * 0.95,
          target: initialLimitPrice * 1.1,
          riskRewardRatio: 2,
        }
      : null;

  const entryQty = useMemo(() => {
    if (Number.isFinite(policyFormContext.entryQty) && policyFormContext.entryQty > 0) {
      return Math.round(policyFormContext.entryQty);
    }
    return 1;
  }, [policyFormContext.entryQty]);

  const onDraftApplied = useCallback((patch: PolicyTradeDraftPatch) => {
    setPolicyDraftPatch(patch);
  }, []);

  const policyApply = useTradePolicyApply({
    bind: null,
    planLevels,
    symbol,
    accountId,
    environment,
    entryQty,
    side: policyFormContext.side,
    entryPrice: policyFormContext.entryPrice ?? initialLimitPrice ?? null,
    existingStop: policyFormContext.existingStop,
    dollarRisk: riskSettings?.dollarRisk ?? null,
    instances: playbookInstances,
    onInstancesChange: () => void refreshPlaybookInstances(),
    onDraftApplied,
  });

  return (
    <EdgeModalShell
      open={open}
      title={`Trade ${symbol}`}
      onClose={onClose}
      maxWidth="sm"
      align="center"
      testId="trade-ticket-modal"
      footer={null}
    >
      <TradeOrderForm
        symbol={symbol}
        theme={theme}
        planLevels={planLevels}
        boundActive
        policyTemplates={policyApply.templates}
        selectedPolicyId={policyApply.selectedTemplateId}
        onPolicyChange={(templateId) => void policyApply.applyPolicy(templateId)}
        policyLoading={policyApply.loading}
        policyApplyError={policyApply.error}
        policyPickerEnabled={Boolean(accountId.trim())}
        policyDraftPatch={policyDraftPatch}
        onPolicyDraftConsumed={() => setPolicyDraftPatch(null)}
        onPolicyFormContextChange={setPolicyFormContext}
        testId="trade-ticket-modal-form"
      />
    </EdgeModalShell>
  );
}
