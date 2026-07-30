import { COPILOT_WORKFLOW_PROMPTS } from "@/lib/ai/agent/promptLibrary";
import {
  CHAT_BLOCK_MAX_REFERENCE_CHIPS,
  CHAT_BLOCK_MAX_ACTION_SUMMARY_ROWS,
  type ActionChatBlock,
  type ActionSummaryRow,
  type ChatBlock,
  type ChatBlockKind,
  type DataChatBlock,
  type FollowupsChatBlock,
  type MediaChatBlock,
  type ReferenceChatBlock,
} from "@/lib/copilot/chatBlocks";
import type { CopilotMessageAttachment, CopilotToolStep } from "@/lib/copilot/types";
import { DESTRUCTIVE_TOOL_NAMES } from "@/lib/ai/agent/confirmGate";
import type { ResearchArtifactHint } from "@/lib/research/artifactHint";
import { copilotAttachmentDisplayUrl } from "@/lib/persistence/client/copilotAttachmentsClient";
import { toolStepDisplayName } from "@/lib/copilot/toolStepDisplay";

/** Tools that emit structured Data blocks when hints or summaries are present. */
const DATA_TOOL_NAMES = new Set([
  "summarize_screen",
  "list_journal_trades",
  "get_journal_trade",
  "get_journal_stats",
  "compare_symbols",
  "analyze_watchlist",
  "create_research_dataset",
  "profile_research_dataset",
  "run_signal_study",
  "run_strategy_evaluation",
  "run_research_code",
  "get_research_job",
]);

/** Tools that emit Reference chips (symbol / interval deep links). */
const REFERENCE_TOOL_NAMES = new Set([
  "get_chart_state",
  "set_symbol",
  "set_chart_range",
  "set_chart_type",
  "go_to_date",
  "search_symbols",
]);

/** Tools that use the Action shell (confirm / preview / propose). */
const ACTION_TOOL_NAMES = new Set([
  "preview_order",
  "place_order",
  "preview_playbook",
  "attach_playbook",
  "prepare_chart_for_analysis",
  "add_drawing",
  "delete_drawing",
  "delete_alert",
  "delete_watchlist",
  "clear_watchlist",
  "delete_indicator_script",
  "remove_research_card",
  "save_pattern_capture",
]);

export function chartOpenHref(symbol: string, interval: string): string {
  const params = new URLSearchParams({ symbol, interval });
  return `/chart?${params.toString()}`;
}

type ReferenceChipDraft = ReferenceChatBlock["chips"][number];

function chartReferenceLabel(symbol: string, interval: string): string {
  return `${symbol.toUpperCase()} · ${interval}`;
}

function parseSymbolIntervalFromSummary(
  summary: string,
): { symbol: string; interval: string } | null {
  const trimmed = summary.trim();
  const partsMatch = trimmed.match(/^([A-Z0-9.-]+)\s*·\s*([^·]+?)(?:\s*·|$)/i);
  if (partsMatch) {
    const symbol = partsMatch[1]!.toUpperCase();
    const interval = partsMatch[2]!.trim();
    if (interval && !/^\d+\s+drawings?$/i.test(interval)) {
      return { symbol, interval };
    }
  }

  const switchedMatch = trimmed.match(/^Switched to\s+([A-Z0-9.-]+)$/i);
  if (switchedMatch) {
    return { symbol: switchedMatch[1]!.toUpperCase(), interval: "D" };
  }

  return null;
}

function referenceChipFromStep(step: CopilotToolStep): ReferenceChipDraft | null {
  if (step.status !== "done") return null;

  if (step.artifactHint?.type === "chart") {
    const symbol = step.artifactHint.symbol.toUpperCase();
    const interval = step.artifactHint.interval;
    return {
      id: `${step.callId}-chart`,
      label: step.artifactHint.title ?? chartReferenceLabel(symbol, interval),
      target: { type: "symbol-interval", symbol, interval },
    };
  }

  if (!REFERENCE_TOOL_NAMES.has(step.name)) return null;

  const summary = step.summary?.trim();
  if (!summary) return null;

  const parsed = parseSymbolIntervalFromSummary(summary);
  if (parsed) {
    return {
      id: `${step.callId}-ref`,
      label: chartReferenceLabel(parsed.symbol, parsed.interval),
      target: { type: "symbol-interval", symbol: parsed.symbol, interval: parsed.interval },
    };
  }

  if (step.name === "search_symbols") {
    const symbolMatch = summary.match(/^([A-Z0-9.-]+)$/i);
    if (symbolMatch) {
      const symbol = symbolMatch[1]!.toUpperCase();
      return {
        id: `${step.callId}-ref`,
        label: symbol,
        target: { type: "symbol-interval", symbol, interval: "D" },
      };
    }
  }

  return null;
}

/** Resolve a reference chip target to an in-app or external href. */
export function referenceTargetHref(
  target: NonNullable<ReferenceChipDraft["target"]>,
): string {
  if (target.type === "symbol-interval") {
    return chartOpenHref(target.symbol, target.interval);
  }
  return target.href;
}

/** Build a Reference block from done tool steps (chart hints + reference tools). */
export function toolStepsToReferenceBlock(steps: CopilotToolStep[]): ReferenceChatBlock | null {
  const seen = new Set<string>();
  const chips: ReferenceChipDraft[] = [];

  for (const step of steps) {
    const chip = referenceChipFromStep(step);
    if (!chip) continue;

    const dedupeKey =
      chip.target?.type === "symbol-interval"
        ? `${chip.target.symbol}|${chip.target.interval}`
        : chip.label.toLowerCase();

    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    chips.push(chip);

    if (chips.length >= CHAT_BLOCK_MAX_REFERENCE_CHIPS) break;
  }

  if (chips.length === 0) return null;
  return { kind: "reference", chips };
}

/** Map artifact hint type to primary block kind per roadmap compatibility table. */
export function hintToBlockKind(hint: ResearchArtifactHint): ChatBlockKind | null {
  switch (hint.type) {
    case "chart":
      return "media";
    case "screener":
    case "journalDraft":
    case "researchProfile":
      return "data";
    case "note":
    case "aiCallout":
      return null;
    default:
      return null;
  }
}

/** Build a compact block sketch from an artifact hint (Phase 2+ render target). */
export function hintToBlockSketch(hint: ResearchArtifactHint): ChatBlock | null {
  const kind = hintToBlockKind(hint);
  if (!kind) return null;

  if (kind === "media" && hint.type === "chart") {
    const block: MediaChatBlock = {
      kind: "media",
      caption: hint.title ?? `${hint.symbol} · ${hint.interval}`,
      openLabel: "Open",
      openHref: chartOpenHref(hint.symbol, hint.interval),
      pinHint: hint,
    };
    return block;
  }

  if (kind === "data") {
    if (hint.type === "researchProfile") {
      const entries =
        hint.keyMetrics != null
          ? Object.entries(hint.keyMetrics).slice(0, 24).map(([key, value]) => ({
              key,
              value: String(value),
            }))
          : undefined;
      const preview = hint.previewTable;
      const block: DataChatBlock =
        preview && preview.columns.length > 0 && preview.rows.length > 0
          ? {
              kind: "data",
              shape: "table",
              title: hint.title ?? "Research profile",
              columns: preview.columns,
              rows: preview.rows,
              pinHint: {
                type: "aiCallout",
                title: hint.title ?? "Research profile",
                summary: entries?.map(({ key, value }) => `${key}: ${value}`).join(" · ") ?? hint.jobId,
              },
            }
          : {
              kind: "data",
              shape: "kv",
              title: hint.title ?? "Research profile",
              entries,
              pinHint: {
                type: "aiCallout",
                title: hint.title ?? "Research profile",
                summary: entries?.map(({ key, value }) => `${key}: ${value}`).join(" · ") ?? hint.jobId,
              },
            };
      return block;
    }

    const title =
      hint.type === "screener"
        ? hint.title ?? "Screener results"
        : hint.type === "journalDraft"
          ? hint.title ?? "Journal trades"
          : undefined;
    const summary =
      hint.type === "screener"
        ? hint.queryLabel ?? hint.screenName
        : hint.type === "journalDraft"
          ? hint.summary
          : undefined;

    const block: DataChatBlock = {
      kind: "data",
      shape: "kv",
      title,
      entries: summary ? [{ key: "Summary", value: summary }] : undefined,
      pinHint: hint,
    };
    return block;
  }

  return null;
}

export function attachmentToMediaBlock(attachment: CopilotMessageAttachment): MediaChatBlock {
  const src = copilotAttachmentDisplayUrl(attachment.id);
  return {
    kind: "media",
    src,
    mimeType: attachment.mimeType,
    caption: attachment.name?.trim() || undefined,
    openLabel: "Open",
    openHref: src,
  };
}

export function toolStepToMediaBlock(step: CopilotToolStep): MediaChatBlock | null {
  if (!step.artifactHint) return null;
  const sketch = hintToBlockSketch(step.artifactHint);
  return sketch?.kind === "media" ? sketch : null;
}

export function toolStepToDataBlock(step: CopilotToolStep): DataChatBlock | null {
  if (!step.artifactHint) return null;
  const sketch = hintToBlockSketch(step.artifactHint);
  return sketch?.kind === "data" ? sketch : null;
}

export function toolNameToBlockKind(toolName: string): ChatBlockKind {
  if (ACTION_TOOL_NAMES.has(toolName) || DESTRUCTIVE_TOOL_NAMES.has(toolName)) {
    return "action";
  }
  if (DATA_TOOL_NAMES.has(toolName)) {
    return "data";
  }
  if (REFERENCE_TOOL_NAMES.has(toolName)) {
    return "reference";
  }
  return "trace";
}

export function isConfirmToolStep(step: CopilotToolStep): boolean {
  return step.status === "pending-confirm" || step.status === "rejected";
}

/** Primary block kind for a tool step — confirm steps always map to Action. */
export function toolStepToBlockKind(step: CopilotToolStep): ChatBlockKind {
  if (isConfirmToolStep(step)) {
    return "action";
  }
  if (step.artifactHint) {
    const hintKind = hintToBlockKind(step.artifactHint);
    if (hintKind) return hintKind;
  }
  return toolNameToBlockKind(step.name);
}

const ACTION_PRIMARY_LABEL = "Accept";
const ACTION_SECONDARY_LABEL = "Reject";

function formatActionSummaryValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return null;
}

function pushActionSummaryRow(
  rows: ActionSummaryRow[],
  key: string,
  value: unknown,
): void {
  if (rows.length >= CHAT_BLOCK_MAX_ACTION_SUMMARY_ROWS) return;
  const formatted = formatActionSummaryValue(value);
  if (!formatted) return;
  rows.push({ key, value: formatted });
}

function pushActionSummaryRowsFromRecord(
  rows: ActionSummaryRow[],
  record: Record<string, unknown>,
  fields: Array<{ argKey: string; label: string }>,
): void {
  for (const { argKey, label } of fields) {
    if (!(argKey in record)) continue;
    pushActionSummaryRow(rows, label, record[argKey]);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function orderDraftSummaryRows(draft: Record<string, unknown>): ActionSummaryRow[] {
  const rows: ActionSummaryRow[] = [];
  pushActionSummaryRowsFromRecord(rows, draft, [
    { argKey: "symbol", label: "Symbol" },
    { argKey: "side", label: "Side" },
    { argKey: "quantity", label: "Qty" },
    { argKey: "orderType", label: "Type" },
    { argKey: "limitPrice", label: "Limit" },
    { argKey: "stopPrice", label: "Stop" },
    { argKey: "tif", label: "TIF" },
    { argKey: "environment", label: "Environment" },
    { argKey: "outsideRth", label: "Outside RTH" },
  ]);
  return rows;
}

function attachPlaybookSummaryRows(args: Record<string, unknown>): ActionSummaryRow[] {
  const rows: ActionSummaryRow[] = [];
  pushActionSummaryRowsFromRecord(rows, args, [
    { argKey: "symbol", label: "Symbol" },
    { argKey: "side", label: "Side" },
    { argKey: "templateId", label: "Template" },
    { argKey: "environment", label: "Environment" },
    { argKey: "qty", label: "Qty" },
    { argKey: "entryPrice", label: "Entry" },
    { argKey: "initialStop", label: "Stop" },
  ]);
  return rows;
}

function deleteDrawingSummaryRows(args: Record<string, unknown>): ActionSummaryRow[] {
  const rows: ActionSummaryRow[] = [];
  pushActionSummaryRowsFromRecord(rows, args, [
    { argKey: "drawingId", label: "Drawing ID" },
    { argKey: "cellIndex", label: "Cell" },
  ]);
  return rows;
}

function prepareChartSummaryRows(args: Record<string, unknown>): ActionSummaryRow[] {
  const rows: ActionSummaryRow[] = [];
  pushActionSummaryRowsFromRecord(rows, args, [
    { argKey: "symbol", label: "Symbol" },
    { argKey: "exchange", label: "Exchange" },
  ]);
  return rows;
}

/** Derive compact Action summary rows from confirm arguments (Phase 5). */
export function actionSummaryRowsFromStep(step: CopilotToolStep): ActionSummaryRow[] {
  const args = step.confirmArguments;
  if (!args) return [];

  switch (step.name) {
    case "place_order": {
      const draft = asRecord(args.draft);
      return draft ? orderDraftSummaryRows(draft) : [];
    }
    case "attach_playbook":
      return attachPlaybookSummaryRows(args);
    case "delete_drawing":
      return deleteDrawingSummaryRows(args);
    case "prepare_chart_for_analysis":
      return prepareChartSummaryRows(args);
    default:
      return [];
  }
}

/** Build a Follow-ups block from curated workflow prompts (Phase 4). */
export function workflowPromptsToFollowupsBlock(): FollowupsChatBlock {
  return {
    kind: "followups",
    chips: COPILOT_WORKFLOW_PROMPTS.map((entry) => ({
      id: entry.id,
      label: entry.label,
      prompt: entry.prompt,
    })),
  };
}

/** Build an Action block from a pending-confirm tool step (Phase 1 shell input). */
export function toolStepToActionBlock(step: CopilotToolStep): ActionChatBlock | null {
  if (step.status !== "pending-confirm") {
    return null;
  }

  const summary = (step.confirmReason ?? step.summary ?? "").trim();
  const summaryRows = actionSummaryRowsFromStep(step);

  return {
    kind: "action",
    title: toolStepDisplayName(step.name),
    summary,
    ...(summaryRows.length > 0 ? { summaryRows } : {}),
    primaryLabel: ACTION_PRIMARY_LABEL,
    secondaryLabel: ACTION_SECONDARY_LABEL,
    callId: step.callId,
    name: step.name,
    ...(step.confirmationToken ? { confirmationToken: step.confirmationToken } : {}),
    ...(step.requiresClientSession != null
      ? { requiresClientSession: step.requiresClientSession }
      : {}),
    ...(step.confirmArguments ? { confirmArguments: step.confirmArguments } : {}),
  };
}
