import { z } from "zod";

import type { ResearchCardSketch } from "./sessionSketch";
import { researchCardSketchSchema } from "./sessionSketch";

/** Phase 2 scratch session — separate from Phase 6 `tv-ai:research-sessions:v1`. */
export const RESEARCH_EVIDENCE_STORAGE_KEY = "tv-ai:research-evidence:v1";

const evidenceEntrySchema = z.object({
  card: researchCardSketchSchema,
  toolCallId: z.string().min(1).optional(),
});

const evidenceStateSchema = z.object({
  entries: z.array(evidenceEntrySchema).max(256),
  threadIds: z.array(z.string().min(1)).max(32),
  updatedAt: z.string().datetime(),
});

type EvidenceEntry = z.infer<typeof evidenceEntrySchema>;
type EvidenceState = z.infer<typeof evidenceStateSchema>;

const listeners = new Set<() => void>();

let cachedState: EvidenceState | null = null;
let cachedCardsSnapshot: ResearchCardSketch[] | null = null;

function defaultState(): EvidenceState {
  return {
    entries: [],
    threadIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function notify(): void {
  cachedState = null;
  cachedCardsSnapshot = null;
  for (const listener of listeners) {
    listener();
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseState(raw: unknown): EvidenceState | null {
  const parsed = evidenceStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function readState(): EvidenceState {
  if (cachedState) return cachedState;
  if (!canUseStorage()) {
    cachedState = defaultState();
    return cachedState;
  }
  try {
    const raw = window.localStorage.getItem(RESEARCH_EVIDENCE_STORAGE_KEY);
    if (!raw) {
      cachedState = defaultState();
      return cachedState;
    }
    cachedState = parseState(JSON.parse(raw)) ?? defaultState();
    return cachedState;
  } catch {
    cachedState = defaultState();
    return cachedState;
  }
}

function writeState(state: EvidenceState): void {
  cachedState = state;
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(RESEARCH_EVIDENCE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function subscribeResearchEvidence(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listEvidenceCards(): ResearchCardSketch[] {
  if (cachedCardsSnapshot) return cachedCardsSnapshot;
  cachedCardsSnapshot = readState().entries.map((entry) => entry.card);
  return cachedCardsSnapshot;
}

export function isEvidencePinned(toolCallId: string): boolean {
  return readState().entries.some((entry) => entry.toolCallId === toolCallId);
}

export function pinEvidenceCard(
  card: ResearchCardSketch,
  options?: { toolCallId?: string; threadId?: string },
): ResearchCardSketch {
  const state = readState();
  if (options?.toolCallId) {
    const existing = state.entries.find((entry) => entry.toolCallId === options.toolCallId);
    if (existing) return existing.card;
  }

  const threadIds = options?.threadId
    ? state.threadIds.includes(options.threadId)
      ? state.threadIds
      : [...state.threadIds, options.threadId]
    : state.threadIds;

  const next: EvidenceState = {
    entries: [...state.entries, { card, toolCallId: options?.toolCallId }],
    threadIds,
    updatedAt: new Date().toISOString(),
  };
  writeState(next);
  notify();
  return card;
}

export function unpinEvidenceCard(cardId: string): void {
  const state = readState();
  const nextEntries = state.entries.filter((entry) => entry.card.id !== cardId);
  if (nextEntries.length === state.entries.length) return;

  writeState({
    entries: nextEntries,
    threadIds: state.threadIds,
    updatedAt: new Date().toISOString(),
  });
  notify();
}

export function reorderEvidenceCards(fromIndex: number, toIndex: number): void {
  const state = readState();
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= state.entries.length ||
    toIndex >= state.entries.length ||
    fromIndex === toIndex
  ) {
    return;
  }

  const entries = [...state.entries];
  const [moved] = entries.splice(fromIndex, 1);
  if (!moved) return;
  entries.splice(toIndex, 0, moved);

  writeState({
    entries,
    threadIds: state.threadIds,
    updatedAt: new Date().toISOString(),
  });
  notify();
}

export function clearResearchEvidenceForTests(): void {
  cachedState = null;
  if (!canUseStorage()) return;
  window.localStorage.removeItem(RESEARCH_EVIDENCE_STORAGE_KEY);
  notify();
}
