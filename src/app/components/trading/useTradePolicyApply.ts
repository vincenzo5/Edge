"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyPolicyToTradeDraft,
  type PolicyTradeDraftPatch,
} from "@/lib/risk/policy/applyPolicyToTradeDraft";
import { resolvePolicyTicketBudget } from "@/lib/risk/policy/resolvePolicyTicketBudget";
import { readDefaultPolicyForSide } from "@/lib/risk/policy/defaultPolicyPreference";
import { recordLastUsedPolicy } from "@/lib/risk/policy/lastUsedPreference";
import type { RiskSettings } from "@/lib/risk/riskSettings";
import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";
import { lockPositionPlan } from "@/lib/trading/playbook/types";
import { PLAYBOOK_PRESET_LIST } from "@/lib/trading/playbook/presets";
import type { PlaybookInstance, PlaybookTemplate } from "@/lib/trading/playbook/types";
import type { OrderSide, TradingEnvironment } from "@/lib/trading/types";
import {
  applyRiskPolicyToBinding,
  clearPlannedPolicyBinding,
} from "@/lib/trading/tradingClient";
import {
  mergePlaybookTemplateLibrary,
  setCachedPlaybookTemplates,
} from "@/lib/trading/playbookTemplateCache";

type TemplateLibraryResponse = {
  presets?: PlaybookTemplate[] | null;
  userTemplates?: PlaybookTemplate[] | null;
};

async function fetchTemplates(): Promise<PlaybookTemplate[]> {
  try {
    const res = await fetch("/api/trading/playbooks/templates");
    if (!res.ok) return PLAYBOOK_PRESET_LIST;
    const body = (await res.json()) as TemplateLibraryResponse;
    const merged = mergePlaybookTemplateLibrary(body);
    if (merged.length === 0) return PLAYBOOK_PRESET_LIST;
    setCachedPlaybookTemplates(merged);
    return merged;
  } catch {
    return PLAYBOOK_PRESET_LIST;
  }
}

function notifyDrawingReshape(
  planLevels: PositionOrderLevels | null | undefined,
  patch: PolicyTradeDraftPatch,
  onReshape: ((levels: DrawingLevelsReshape) => void) | undefined,
): void {
  if (!onReshape || !planLevels || patch.takeProfitPrice == null) return;
  const target = patch.takeProfitPrice;
  if (Math.abs(target - planLevels.target) < 1e-12) return;
  onReshape({
    entry: planLevels.entry,
    stop: planLevels.stop,
    target,
  });
}

export type TradePolicyApplyBind = {
  drawingId: string;
};

export type TradePolicyFormContext = {
  entryQty: number;
  side: OrderSide;
  entryPrice: number | null;
  existingStop: number | null;
};

export type DrawingLevelsReshape = {
  entry: number;
  stop: number;
  target: number;
};

export function useTradePolicyApply(args: {
  bind: TradePolicyApplyBind | null;
  planLevels: PositionOrderLevels | null;
  symbol: string;
  accountId: string;
  environment: TradingEnvironment;
  entryQty: number;
  side: OrderSide;
  entryPrice?: number | null;
  existingStop?: number | null;
  dollarRisk?: number | null;
  sessionSettings: RiskSettings;
  accountBasisValue?: number | null;
  instances: PlaybookInstance[];
  onInstancesChange?: () => void;
  onDraftApplied?: (patch: PolicyTradeDraftPatch) => void;
  onDrawingLevelsReshaped?: (levels: DrawingLevelsReshape) => void;
}) {
  const [templates, setTemplates] = useState<PlaybookTemplate[]>(PLAYBOOK_PRESET_LIST);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftPolicyId, setDraftPolicyId] = useState<string | null>(null);
  const prevBindRef = useRef<string | null>(null);
  const prevSideRef = useRef<OrderSide>(args.side);
  const userClearedSideRef = useRef<OrderSide | null>(null);

  const plannedInstance = useMemo(
    () =>
      args.instances.find(
        (item) =>
          item.status === "planned" &&
          item.bindingRef?.kind === "drawing" &&
          item.bindingRef.id === args.bind?.drawingId,
      ) ?? null,
    [args.bind?.drawingId, args.instances],
  );

  const selectedTemplateId = plannedInstance?.templateId ?? draftPolicyId;

  const isBound = args.bind?.drawingId != null && args.planLevels != null;

  const refresh = useCallback(async () => {
    const next = await fetchTemplates();
    setTemplates(next);
    args.onInstancesChange?.();
  }, [args.onInstancesChange]);

  useEffect(() => {
    void fetchTemplates().then(setTemplates);
  }, []);

  const resolveTemplateBudget = useCallback(
    (template: PlaybookTemplate) =>
      resolvePolicyTicketBudget({
        budget: template.budget,
        sessionSettings: args.sessionSettings,
        accountBasisValue: args.accountBasisValue ?? null,
        sessionDollarRisk: args.dollarRisk,
      }),
    [
      args.accountBasisValue,
      args.dollarRisk,
      args.sessionSettings,
    ],
  );

  const persistPolicy = useCallback(
    async (templateId: string) => {
      if (!args.bind?.drawingId || !args.planLevels || !args.accountId.trim()) {
        throw new Error("Link a position drawing before persisting a policy.");
      }
      const template = templates.find((item) => item.id === templateId);
      if (!template) {
        throw new Error("Policy template not found.");
      }
      const budget = resolveTemplateBudget(template);
      const patch = applyPolicyToTradeDraft({
        template,
        entryQty: args.entryQty,
        side: args.side,
        planLevels: args.planLevels,
        entryPrice: args.entryPrice,
        existingStop: args.existingStop,
        dollarRisk: budget.dollarRisk,
      });
      const sizedQty = patch.entryQty ?? args.entryQty;
      const positionPlan = lockPositionPlan({
        symbol: args.symbol.trim().toUpperCase(),
        accountId: args.accountId.trim(),
        side: args.planLevels.side,
        entry: args.planLevels.entry,
        initialStop: args.planLevels.stop,
        qty: Math.max(1, Math.round(sizedQty)),
        environment: args.environment,
      });

      await applyRiskPolicyToBinding({
        templateId,
        positionPlan,
        bindingRef: { kind: "drawing", id: args.bind.drawingId },
        onConflict: "swap",
      });
      recordLastUsedPolicy(args.planLevels.side, templateId);
      notifyDrawingReshape(args.planLevels, patch, args.onDrawingLevelsReshaped);
      args.onDraftApplied?.(patch);
      await refresh();
    },
    [
      args.accountId,
      args.bind?.drawingId,
      args.entryPrice,
      args.entryQty,
      args.environment,
      args.existingStop,
      args.onDraftApplied,
      args.onDrawingLevelsReshaped,
      args.planLevels,
      args.side,
      args.symbol,
      refresh,
      resolveTemplateBudget,
      templates,
    ],
  );

  const applyDraft = useCallback(
    (template: PlaybookTemplate) => {
      if (!Number.isFinite(args.entryQty) || args.entryQty <= 0) {
        setError("Enter a valid quantity before applying a policy.");
        return;
      }
      const budget = resolveTemplateBudget(template);
      const patch = applyPolicyToTradeDraft({
        template,
        entryQty: args.entryQty,
        side: args.side,
        planLevels: args.planLevels,
        entryPrice: args.entryPrice,
        existingStop: args.existingStop,
        dollarRisk: budget.dollarRisk,
      });
      setDraftPolicyId(template.id);
      recordLastUsedPolicy(args.side, template.id);
      setError(null);
      notifyDrawingReshape(args.planLevels, patch, args.onDrawingLevelsReshaped);
      args.onDraftApplied?.(patch);
    },
    [
      args.entryPrice,
      args.entryQty,
      args.existingStop,
      args.onDraftApplied,
      args.onDrawingLevelsReshaped,
      args.planLevels,
      args.side,
      resolveTemplateBudget,
    ],
  );

  const applyPolicy = useCallback(
    async (templateId: string | null) => {
      setError(null);

      if (templateId == null) {
        setDraftPolicyId(null);
        if (!isBound) {
          userClearedSideRef.current = args.side;
        }
        if (isBound && args.bind?.drawingId) {
          setLoading(true);
          try {
            await clearPlannedPolicyBinding({
              kind: "drawing",
              id: args.bind.drawingId,
            });
            await refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Clear failed");
          } finally {
            setLoading(false);
          }
        }
        return;
      }

      if (!Number.isFinite(args.entryQty) || args.entryQty <= 0) {
        setError("Enter a valid quantity before applying a policy.");
        return;
      }

      const template = templates.find((item) => item.id === templateId);
      if (!template) {
        setError("Policy template not found.");
        return;
      }

      if (isBound) {
        setLoading(true);
        try {
          await persistPolicy(templateId);
          setDraftPolicyId(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Apply failed");
        } finally {
          setLoading(false);
        }
        return;
      }

      applyDraft(template);
    },
    [
      applyDraft,
      args.bind?.drawingId,
      args.entryQty,
      args.side,
      isBound,
      persistPolicy,
      refresh,
      templates,
    ],
  );

  useEffect(() => {
    if (prevSideRef.current === args.side) return;
    prevSideRef.current = args.side;
    if (plannedInstance?.templateId) return;
    setDraftPolicyId(null);
    userClearedSideRef.current = null;
  }, [args.side, plannedInstance?.templateId]);

  useEffect(() => {
    if (plannedInstance?.templateId) return;
    if (userClearedSideRef.current === args.side) return;
    if (draftPolicyId != null) return;

    const defaultId = readDefaultPolicyForSide(args.side);
    if (!defaultId) return;

    const template = templates.find(
      (item) => item.id === defaultId && item.id.startsWith("user_"),
    );
    if (!template) return;

    if (!Number.isFinite(args.entryQty) || args.entryQty <= 0) return;

    applyDraft(template);
  }, [
    applyDraft,
    args.entryQty,
    args.side,
    draftPolicyId,
    plannedInstance?.templateId,
    templates,
  ]);

  useEffect(() => {
    const drawingId = args.bind?.drawingId ?? null;
    const prev = prevBindRef.current;
    prevBindRef.current = drawingId;

    if (prev != null || drawingId == null || draftPolicyId == null) return;
    if (!args.planLevels || !args.accountId.trim()) return;

    void (async () => {
      setLoading(true);
      try {
        await persistPolicy(draftPolicyId);
        setDraftPolicyId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upgrade to drawing bind failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [
    args.accountId,
    args.bind?.drawingId,
    args.planLevels,
    draftPolicyId,
    persistPolicy,
  ]);

  useEffect(() => {
    if (plannedInstance?.templateId) {
      setDraftPolicyId(null);
    }
  }, [plannedInstance?.templateId]);

  const userTemplates = useMemo(
    () =>
      templates.filter(
        (item): item is PlaybookTemplate =>
          item != null && typeof item.id === "string" && item.id.startsWith("user_"),
      ),
    [templates],
  );

  return {
    templates: userTemplates,
    plannedInstance,
    selectedTemplateId,
    loading,
    error,
    applyPolicy,
    refresh,
  };
}
