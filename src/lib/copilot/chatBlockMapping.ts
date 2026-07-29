import type { ChatBlock, ChatBlockKind, DataChatBlock, ReferenceChatBlock } from "@/lib/copilot/chatBlocks";
import type { CopilotToolStep } from "@/lib/copilot/types";
import { DESTRUCTIVE_TOOL_NAMES } from "@/lib/ai/agent/confirmGate";
import type { ResearchArtifactHint } from "@/lib/research/artifactHint";

/** Tools that emit structured Data blocks when hints or summaries are present. */
const DATA_TOOL_NAMES = new Set([
  "summarize_screen",
  "list_journal_trades",
  "get_journal_trade",
  "get_journal_stats",
  "compare_symbols",
  "analyze_watchlist",
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

/** Map artifact hint type to primary block kind per roadmap compatibility table. */
export function hintToBlockKind(hint: ResearchArtifactHint): ChatBlockKind | null {
  switch (hint.type) {
    case "chart":
      return "reference";
    case "screener":
    case "journalDraft":
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

  if (kind === "reference" && hint.type === "chart") {
    const block: ReferenceChatBlock = {
      kind: "reference",
      chips: [
        {
          id: `chart-${hint.symbol}-${hint.interval}`,
          label: hint.title ?? `${hint.symbol} · ${hint.interval}`,
          target: {
            type: "symbol-interval",
            symbol: hint.symbol,
            interval: hint.interval,
          },
        },
      ],
    };
    return block;
  }

  if (kind === "data") {
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
