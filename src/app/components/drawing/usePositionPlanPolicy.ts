"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SerializedDrawing } from "@edge/chart-core/contracts";
import { computePositionRiskPreview } from "@/lib/risk/computePositionRiskPreview";
import { buildPositionPlanFromPreview } from "@/lib/risk/policy/buildPositionPlanFromPreview";
import { resolveAutoApplyTemplateId } from "@/lib/risk/policy/resolveAutoApplyTemplateId";
import { recordLastUsedPolicy } from "@/lib/risk/policy/lastUsedPreference";
import { derivePolicyIntegrity } from "@/lib/risk/policy/integrity";
import { assessTemplateCompleteness } from "@/lib/risk/policy/completeness";
import { playbookTemplateToRiskPolicyTemplateFull } from "@/lib/risk/policy/templateReview";
import {
  isRestingBrokerProtectExit,
  resolveTemplateExits,
} from "@/lib/risk/policy/types";
import { buildPlannedLevelsSyncPatch } from "@/lib/risk/policy/syncPlannedLevels";
import {
  applyRiskPolicyToBinding,
  clearPlannedPolicyBinding,
  syncPlannedInstance,
} from "@/lib/trading/tradingClient";
import { PLAYBOOK_PRESET_LIST } from "@/lib/trading/playbook/presets";
import { mergePlaybookTemplateLibrary } from "@/lib/trading/playbookTemplateCache";
import type {
  PlaybookInstance,
  PlaybookInstanceWithPolicy,
  PlaybookTemplate,
} from "@/lib/trading/playbook/types";
import type { TradingEnvironment } from "@/lib/trading/types";

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
    return merged.length > 0 ? merged : PLAYBOOK_PRESET_LIST;
  } catch {
    return PLAYBOOK_PRESET_LIST;
  }
}

export type PositionPlanPolicyState = {
  templates: PlaybookTemplate[];
  plannedInstance: PlaybookInstance | null;
  selectedTemplateId: string | null;
  loading: boolean;
  error: string | null;
  integrityChips: Array<{ label: string; ok: boolean }>;
  applyPolicy: (templateId: string | null) => Promise<void>;
  syncLevelsFromDrawing: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function usePositionPlanPolicy(args: {
  drawing: SerializedDrawing;
  symbol: string;
  accountId: string;
  environment: TradingEnvironment;
  dollarRisk: number | null;
  instances: PlaybookInstance[];
  onInstancesChange?: () => void;
}): PositionPlanPolicyState {
  const [templates, setTemplates] = useState<PlaybookTemplate[]>(PLAYBOOK_PRESET_LIST);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoAppliedRef = useRef<string | null>(null);

  const preview = useMemo(
    () => computePositionRiskPreview(args.drawing, args.dollarRisk),
    [args.drawing, args.dollarRisk],
  );

  const plannedInstance = useMemo((): PlaybookInstanceWithPolicy | null => {
    const row =
      args.instances.find(
        (item) =>
          item.status === "planned" &&
          item.bindingRef?.kind === "drawing" &&
          item.bindingRef.id === args.drawing.id,
      ) ?? null;
    return row as PlaybookInstanceWithPolicy | null;
  }, [args.drawing.id, args.instances]);

  const selectedTemplateId = plannedInstance?.templateId ?? null;

  const refresh = useCallback(async () => {
    const next = await fetchTemplates();
    setTemplates(next);
    args.onInstancesChange?.();
  }, [args.onInstancesChange]);

  const applyPolicy = useCallback(
    async (templateId: string | null) => {
      setError(null);
      if (!preview || !args.accountId.trim()) {
        setError("Select an account and complete plan geometry first.");
        return;
      }
      const drawingId = args.drawing.id;
      if (!drawingId) {
        setError("Drawing id is missing.");
        return;
      }
      setLoading(true);
      try {
        if (templateId == null) {
          await clearPlannedPolicyBinding({
            kind: "drawing",
            id: drawingId,
          });
          await refresh();
          return;
        }

        const positionPlan = buildPositionPlanFromPreview({
          preview,
          symbol: args.symbol,
          accountId: args.accountId,
          environment: args.environment,
        });

        await applyRiskPolicyToBinding({
          templateId,
          positionPlan,
          bindingRef: { kind: "drawing", id: drawingId },
          onConflict: "swap",
        });
        recordLastUsedPolicy(preview.side, templateId);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Apply failed");
      } finally {
        setLoading(false);
      }
    },
    [args.accountId, args.drawing.id, args.environment, args.symbol, preview, refresh],
  );

  const syncLevelsFromDrawing = useCallback(async () => {
    if (!plannedInstance || !preview) return;
    const positionPlan = buildPositionPlanFromPreview({
      preview,
      symbol: args.symbol,
      accountId: args.accountId,
      environment: args.environment,
      qty: plannedInstance.positionPlan.qty,
    });
    const patch = buildPlannedLevelsSyncPatch(positionPlan);
    await syncPlannedInstance(plannedInstance.id, patch);
    args.onInstancesChange?.();
  }, [
    args.accountId,
    args.environment,
    args.onInstancesChange,
    args.symbol,
    plannedInstance,
    preview,
  ]);

  const lastSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    void fetchTemplates().then(setTemplates);
  }, []);

  useEffect(() => {
    if (!preview || !args.accountId.trim()) return;
    if (plannedInstance) return;
    const drawingId = args.drawing.id;
    if (!drawingId) return;
    if (autoAppliedRef.current === drawingId) return;
    autoAppliedRef.current = drawingId;
    const templateId = resolveAutoApplyTemplateId(preview.side);
    void applyPolicy(templateId);
  }, [applyPolicy, args.accountId, args.drawing.id, plannedInstance, preview]);

  useEffect(() => {
    if (!plannedInstance || !preview) return;
    const key = `${plannedInstance.id}:${preview.entry}:${preview.stop}:${preview.target}`;
    if (lastSyncedRef.current === key) return;
    lastSyncedRef.current = key;
    void syncPlannedInstance(plannedInstance.id, buildPlannedLevelsSyncPatch(
      buildPositionPlanFromPreview({
        preview,
        symbol: args.symbol,
        accountId: args.accountId,
        environment: args.environment,
        qty: plannedInstance.positionPlan.qty,
      }),
    )).then(() => args.onInstancesChange?.());
  }, [
    args.accountId,
    args.environment,
    args.onInstancesChange,
    args.symbol,
    plannedInstance,
    preview?.entry,
    preview?.stop,
    preview?.target,
  ]);

  const integrityChips = useMemo(() => {
    const template = plannedInstance?.policySnapshot
      ? plannedInstance.policySnapshot
      : selectedTemplateId
        ? (() => {
            const row = templates.find((item) => item.id === selectedTemplateId);
            return row ? playbookTemplateToRiskPolicyTemplateFull(row) : null;
          })()
        : null;

    if (!template) {
      return [{ label: "No policy", ok: false }];
    }

    const completeness = assessTemplateCompleteness(template);
    const exits = resolveTemplateExits(template);
    const hasProtect = exits.some(isRestingBrokerProtectExit);
    const hasManage = exits.some((rule) => (rule.binding ?? "managedApp") === "managedApp");
    const hasTrailOnly = exits.some(
      (rule) => rule.then.kind === "attachTrail" && (rule.binding ?? "managedApp") === "managedApp",
    );
    const integrity = derivePolicyIntegrity({ template });

    return [
      { label: "Protect", ok: hasProtect },
      { label: "TP", ok: completeness.slots.geometry === "present" },
      { label: "Manage", ok: hasManage },
      ...(hasTrailOnly ? [{ label: "Trail = Manage", ok: true }] : []),
      {
        label: integrity === "ok" ? "Integrity OK" : integrity.replace("_", " "),
        ok: integrity === "ok",
      },
    ];
  }, [plannedInstance?.policySnapshot, selectedTemplateId, templates]);

  return {
    templates,
    plannedInstance,
    selectedTemplateId,
    loading,
    error,
    integrityChips,
    applyPolicy,
    syncLevelsFromDrawing,
    refresh,
  };
}
