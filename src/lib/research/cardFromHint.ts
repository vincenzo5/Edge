import type { ResearchArtifactHint } from "./artifactHint";
import type { ResearchCardSketch } from "./sessionSketch";

export type PinProvenance = {
  threadId: string;
  messageId: string;
  toolCallId?: string;
};

function createCardId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Convert a stream artifact hint + Copilot provenance into a Research Session card. */
export function researchCardFromHint(
  hint: ResearchArtifactHint,
  provenance: PinProvenance,
): ResearchCardSketch {
  const base = {
    id: createCardId(),
    source: "ai" as const,
    threadId: provenance.threadId,
    messageId: provenance.messageId,
  };

  switch (hint.type) {
    case "chart":
      return {
        ...base,
        type: "chart",
        symbol: hint.symbol,
        interval: hint.interval,
      };
    case "screener":
      return {
        ...base,
        type: "screener",
        queryLabel: hint.queryLabel ?? hint.screenName ?? hint.title,
      };
    case "journalDraft":
      return {
        ...base,
        type: "journalDraft",
        draftTradeId: hint.draftTradeId,
        summary: hint.summary ?? hint.title,
      };
    case "note":
      return {
        ...base,
        type: "note",
        title: hint.title,
        body: hint.body,
      };
    case "aiCallout":
      return {
        ...base,
        type: "aiCallout",
        summary: hint.summary,
        threadId: provenance.threadId,
        messageId: provenance.messageId,
      };
    default: {
      const _exhaustive: never = hint;
      return _exhaustive;
    }
  }
}

export function researchCardTitle(card: ResearchCardSketch): string {
  switch (card.type) {
    case "chart":
      return `${card.symbol} · ${card.interval}`;
    case "screener":
      return card.queryLabel ?? "Screener results";
    case "note":
      return card.title ?? card.body.slice(0, 80);
    case "journalDraft":
      return card.summary ?? "Journal draft";
    case "aiCallout":
      return card.summary.slice(0, 120);
    case "deskLink":
      return card.label ?? "Desk link";
    default: {
      const _exhaustive: never = card;
      return _exhaustive;
    }
  }
}

export function researchCardSubtitle(card: ResearchCardSketch): string | null {
  switch (card.type) {
    case "chart":
      return "Chart";
    case "screener":
      return "Screener";
    case "note":
      return "Note";
    case "journalDraft":
      return "Journal";
    case "aiCallout":
      return "AI callout";
    case "deskLink":
      return "Desk";
    default: {
      const _exhaustive: never = card;
      return _exhaustive;
    }
  }
}
