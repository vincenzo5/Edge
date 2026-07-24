import { z } from "zod";

import type {
  ResearchCardSketch,
  ResearchLinkSketch,
  ResearchReelBeatSketch,
  ResearchSessionSketch,
} from "./sessionSketch";
import {
  RESEARCH_SESSION_SKETCH_VERSION,
  RESEARCH_SESSIONS_STORAGE_KEY,
  researchCardSketchSchema,
  researchLinkSketchSchema,
  researchReelBeatSketchSchema,
  researchSessionSketchSchema,
} from "./sessionSketch";
import {
  appendReelBeatPure,
  appendReelBeatsForCardsPure,
  pruneReelForRemovedCard,
  removeReelBeatPure,
  reorderReelBeatsPure,
} from "./reelBeats";
import type { ResearchSessionSummary } from "@/lib/persistence/schemas/researchSessions";

const BOARD_SESSIONS_DOC_VERSION = 1 as const;
export const MAX_RESEARCH_SESSIONS = 50;
export const DEFAULT_RESEARCH_SESSION_TITLE = "Research session";

const localResearchSessionRecordSchema = researchSessionSketchSchema.extend({
  syncRevision: z.number().int().positive().default(1),
  archivedAt: z.string().datetime().nullable().optional(),
});

export type LocalResearchSessionRecord = z.infer<typeof localResearchSessionRecordSchema>;

const boardSessionsDocSchema = z.object({
  schemaVersion: z.literal(BOARD_SESSIONS_DOC_VERSION),
  activeSessionId: z.string().uuid(),
  sessions: z.array(localResearchSessionRecordSchema).max(MAX_RESEARCH_SESSIONS),
});

type BoardSessionsDoc = z.infer<typeof boardSessionsDocSchema>;

const listeners = new Set<() => void>();

let cachedDoc: BoardSessionsDoc | null = null;
let cachedSessionSnapshot: ResearchSessionSketch | null = null;
let cachedSummariesSnapshot: ResearchSessionSummary[] | null = null;

const DEFAULT_CARD_WIDTH = 240;
const DEFAULT_CARD_HEIGHT = 120;
export const BOARD_CHART_CARD_WIDTH = 320;
export const BOARD_CHART_CARD_HEIGHT = 220;
const POSITION_CASCADE_X = 48;
const POSITION_CASCADE_Y = 48;
const POSITION_ORIGIN_X = 80;
const POSITION_ORIGIN_Y = 80;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function notify(): void {
  cachedDoc = null;
  cachedSessionSnapshot = null;
  cachedSummariesSnapshot = null;
  for (const listener of listeners) {
    listener();
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function defaultCardDimensions(card: ResearchCardSketch): { width: number; height: number } {
  if (card.type === "chart") {
    return { width: BOARD_CHART_CARD_WIDTH, height: BOARD_CHART_CARD_HEIGHT };
  }
  return { width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT };
}

function defaultPosition(
  index: number,
  card?: ResearchCardSketch,
): { x: number; y: number; width: number; height: number } {
  const { width, height } = card ? defaultCardDimensions(card) : { width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT };
  return {
    x: POSITION_ORIGIN_X + index * POSITION_CASCADE_X,
    y: POSITION_ORIGIN_Y + index * POSITION_CASCADE_Y,
    width,
    height,
  };
}

function createDefaultSession(title = DEFAULT_RESEARCH_SESSION_TITLE): LocalResearchSessionRecord {
  const id = createId();
  return localResearchSessionRecordSchema.parse({
    id,
    schemaVersion: RESEARCH_SESSION_SKETCH_VERSION,
    title,
    cards: [],
    links: [],
    threadIds: [],
    reel: [],
    updatedAt: new Date().toISOString(),
    syncRevision: 1,
  });
}

function createDefaultDoc(): BoardSessionsDoc {
  const session = createDefaultSession();
  return {
    schemaVersion: BOARD_SESSIONS_DOC_VERSION,
    activeSessionId: session.id,
    sessions: [session],
  };
}

function normalizeSession(raw: unknown): LocalResearchSessionRecord | null {
  const withRevision = z
    .object({
      syncRevision: z.number().int().positive().optional(),
      archivedAt: z.string().datetime().nullable().optional(),
    })
    .passthrough()
    .safeParse(raw);
  if (!withRevision.success) return null;

  const parsed = researchSessionSketchSchema.safeParse(raw);
  if (!parsed.success) return null;

  return localResearchSessionRecordSchema.parse({
    ...parsed.data,
    syncRevision: withRevision.data.syncRevision ?? 1,
    archivedAt: withRevision.data.archivedAt ?? null,
  });
}

function parseDoc(raw: unknown): BoardSessionsDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  if (candidate.schemaVersion !== BOARD_SESSIONS_DOC_VERSION) return null;
  if (typeof candidate.activeSessionId !== "string") return null;
  if (!Array.isArray(candidate.sessions)) return null;

  const sessions = candidate.sessions
    .map((entry) => normalizeSession(entry))
    .filter((entry): entry is LocalResearchSessionRecord => entry !== null && !entry.archivedAt);

  if (sessions.length === 0) return null;

  const activeSessionId =
    sessions.some((entry) => entry.id === candidate.activeSessionId)
      ? candidate.activeSessionId
      : sessions[0]!.id;

  return boardSessionsDocSchema.parse({
    schemaVersion: BOARD_SESSIONS_DOC_VERSION,
    activeSessionId,
    sessions,
  });
}

function readDoc(): BoardSessionsDoc {
  if (cachedDoc) return cachedDoc;
  if (!canUseStorage()) {
    cachedDoc = createDefaultDoc();
    return cachedDoc;
  }
  try {
    const raw = window.localStorage.getItem(RESEARCH_SESSIONS_STORAGE_KEY);
    if (!raw) {
      cachedDoc = createDefaultDoc();
      return cachedDoc;
    }
    cachedDoc = parseDoc(JSON.parse(raw)) ?? createDefaultDoc();
    return cachedDoc;
  } catch {
    cachedDoc = createDefaultDoc();
    return cachedDoc;
  }
}

function writeDoc(doc: BoardSessionsDoc): void {
  cachedDoc = doc;
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(RESEARCH_SESSIONS_STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // ignore quota / private mode
  }
}

function getActiveSessionFromDoc(doc: BoardSessionsDoc): LocalResearchSessionRecord {
  const session =
    doc.sessions.find((entry) => entry.id === doc.activeSessionId && !entry.archivedAt) ??
    doc.sessions.find((entry) => !entry.archivedAt);
  if (session) return session;
  const fallback = createDefaultSession();
  writeDoc({
    schemaVersion: BOARD_SESSIONS_DOC_VERSION,
    activeSessionId: fallback.id,
    sessions: [fallback],
  });
  return fallback;
}

function toSessionSketch(record: LocalResearchSessionRecord): ResearchSessionSketch {
  return researchSessionSketchSchema.parse(record);
}

function updateActiveSession(
  updater: (session: LocalResearchSessionRecord) => LocalResearchSessionRecord,
): LocalResearchSessionRecord {
  const doc = readDoc();
  const active = getActiveSessionFromDoc(doc);
  const nextSession = localResearchSessionRecordSchema.parse({
    ...updater({
      ...active,
      updatedAt: new Date().toISOString(),
    }),
    updatedAt: new Date().toISOString(),
  });
  const nextDoc: BoardSessionsDoc = {
    schemaVersion: BOARD_SESSIONS_DOC_VERSION,
    activeSessionId: nextSession.id,
    sessions: doc.sessions.map((entry) => (entry.id === nextSession.id ? nextSession : entry)),
  };
  writeDoc(nextDoc);
  notify();
  return nextSession;
}

function upsertSessionRecord(record: LocalResearchSessionRecord): void {
  const doc = readDoc();
  const existingIndex = doc.sessions.findIndex((entry) => entry.id === record.id);
  const sessions =
    existingIndex >= 0
      ? doc.sessions.map((entry, index) => (index === existingIndex ? record : entry))
      : [...doc.sessions, record].slice(0, MAX_RESEARCH_SESSIONS);

  writeDoc({
    schemaVersion: BOARD_SESSIONS_DOC_VERSION,
    activeSessionId: doc.activeSessionId,
    sessions,
  });
  notify();
}

function cloneCardForBoard(card: ResearchCardSketch, index: number): ResearchCardSketch {
  const position = defaultPosition(index, card);
  const parsed = researchCardSketchSchema.parse({
    ...card,
    id: createId(),
    position,
  });
  return parsed;
}

export function subscribeResearchBoardSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveBoardSession(): ResearchSessionSketch {
  if (cachedSessionSnapshot) return cachedSessionSnapshot;
  cachedSessionSnapshot = toSessionSketch(getActiveSessionFromDoc(readDoc()));
  return cachedSessionSnapshot;
}

export function getActiveSessionRecord(): LocalResearchSessionRecord {
  return getActiveSessionFromDoc(readDoc());
}

export function getResearchSessionRecord(sessionId: string): LocalResearchSessionRecord | null {
  const doc = readDoc();
  const record = doc.sessions.find((entry) => entry.id === sessionId && !entry.archivedAt);
  return record ?? null;
}

export function listResearchSessionSummaries(): ResearchSessionSummary[] {
  if (cachedSummariesSnapshot) return cachedSummariesSnapshot;
  const doc = readDoc();
  cachedSummariesSnapshot = doc.sessions
    .filter((entry) => !entry.archivedAt)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      schemaVersion: RESEARCH_SESSION_SKETCH_VERSION,
      syncRevision: entry.syncRevision,
      updatedAt: entry.updatedAt,
      cardCount: entry.cards.length,
      linkCount: entry.links.length,
    }));
  return cachedSummariesSnapshot;
}

export function createResearchSession(title?: string): LocalResearchSessionRecord {
  const doc = readDoc();
  const activeCount = doc.sessions.filter((entry) => !entry.archivedAt).length;
  if (activeCount >= MAX_RESEARCH_SESSIONS) {
    return getActiveSessionFromDoc(doc);
  }

  const session = createDefaultSession(title?.trim() || DEFAULT_RESEARCH_SESSION_TITLE);
  writeDoc({
    schemaVersion: BOARD_SESSIONS_DOC_VERSION,
    activeSessionId: session.id,
    sessions: [...doc.sessions, session],
  });
  notify();
  return session;
}

export function setActiveResearchSession(sessionId: string): LocalResearchSessionRecord | null {
  const doc = readDoc();
  const target = doc.sessions.find((entry) => entry.id === sessionId && !entry.archivedAt);
  if (!target) return null;

  writeDoc({
    ...doc,
    activeSessionId: sessionId,
  });
  notify();
  return target;
}

export function renameResearchSession(sessionId: string, title: string): LocalResearchSessionRecord | null {
  const trimmed = title.trim().slice(0, 200) || DEFAULT_RESEARCH_SESSION_TITLE;
  const doc = readDoc();
  const target = doc.sessions.find((entry) => entry.id === sessionId && !entry.archivedAt);
  if (!target) return null;

  const next = localResearchSessionRecordSchema.parse({
    ...target,
    title: trimmed,
    updatedAt: new Date().toISOString(),
  });
  upsertSessionRecord(next);
  return next;
}

export function deleteResearchSession(sessionId: string): void {
  const doc = readDoc();
  const target = doc.sessions.find((entry) => entry.id === sessionId);
  if (!target) return;

  const archived = localResearchSessionRecordSchema.parse({
    ...target,
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const remaining = doc.sessions
    .map((entry) => (entry.id === sessionId ? archived : entry))
    .filter((entry) => !entry.archivedAt);

  let nextSessions = doc.sessions.map((entry) => (entry.id === sessionId ? archived : entry));
  let activeSessionId = doc.activeSessionId;

  if (doc.activeSessionId === sessionId) {
    if (remaining.length === 0) {
      const fallback = createDefaultSession();
      nextSessions = [...nextSessions.filter((entry) => entry.id !== sessionId), fallback];
      activeSessionId = fallback.id;
    } else {
      activeSessionId = remaining[0]!.id;
    }
  }

  writeDoc({
    schemaVersion: BOARD_SESSIONS_DOC_VERSION,
    activeSessionId,
    sessions: nextSessions,
  });
  notify();
}

export function applyCloudResearchSessionRecord(record: LocalResearchSessionRecord): void {
  upsertSessionRecord(record);
}

export function setActiveSessionSyncRevision(sessionId: string, syncRevision: number): void {
  const record = getResearchSessionRecord(sessionId);
  if (!record) return;
  upsertSessionRecord(
    localResearchSessionRecordSchema.parse({
      ...record,
      syncRevision,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function addBoardCard(card: ResearchCardSketch): ResearchCardSketch {
  const session = getActiveBoardSession();
  const index = session.cards.length;
  const withPosition: ResearchCardSketch = researchCardSketchSchema.parse({
    ...card,
    position: card.position ?? defaultPosition(index, card),
  });

  updateActiveSession((current) => {
    const cards = [...current.cards, withPosition];
    return {
      ...current,
      cards,
      reel: appendReelBeatPure(current.reel, cards, {
        cardId: withPosition.id,
        allowDuplicate: false,
        createId,
      }),
      threadIds:
        withPosition.threadId && !current.threadIds.includes(withPosition.threadId)
          ? [...current.threadIds, withPosition.threadId]
          : current.threadIds,
    };
  });

  return withPosition;
}

function resolveCardDimensions(card: ResearchCardSketch): { width: number; height: number } {
  if (card.position?.width && card.position?.height) {
    return { width: card.position.width, height: card.position.height };
  }
  return defaultCardDimensions(card);
}

export function updateBoardCardPosition(
  cardId: string,
  position: { x: number; y: number; width?: number; height?: number },
): void {
  updateActiveSession((session) => ({
    ...session,
    cards: session.cards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            position: {
              x: position.x,
              y: position.y,
              width: position.width ?? card.position?.width ?? resolveCardDimensions(card).width,
              height: position.height ?? card.position?.height ?? resolveCardDimensions(card).height,
            },
          }
        : card,
    ),
  }));
}

export type BoardCardDeskBinding = {
  deskTileId?: string;
  appWorkspaceId?: string;
  chartWorkspaceId?: string;
};

export function updateBoardCardBinding(cardId: string, binding: BoardCardDeskBinding): void {
  updateActiveSession((session) => ({
    ...session,
    cards: session.cards.map((card) => {
      if (card.id !== cardId) return card;
      if (card.type === "chart") {
        return researchCardSketchSchema.parse({
          ...card,
          deskTileId: binding.deskTileId ?? card.deskTileId,
          appWorkspaceId: binding.appWorkspaceId ?? card.appWorkspaceId,
          chartWorkspaceId: binding.chartWorkspaceId ?? card.chartWorkspaceId,
        });
      }
      if (card.type === "deskLink") {
        return researchCardSketchSchema.parse({
          ...card,
          tileId: binding.deskTileId ?? card.tileId,
          appWorkspaceId: binding.appWorkspaceId ?? card.appWorkspaceId,
        });
      }
      if (card.type === "screener" || card.type === "journalDraft") {
        return card;
      }
      return card;
    }),
  }));
}

export function removeBoardCard(cardId: string): void {
  updateActiveSession((session) => ({
    ...session,
    cards: session.cards.filter((card) => card.id !== cardId),
    links: session.links.filter(
      (link) => link.fromCardId !== cardId && link.toCardId !== cardId,
    ),
    reel: pruneReelForRemovedCard(session.reel, cardId),
  }));
}

export function addBoardLink(fromCardId: string, toCardId: string, label?: string): ResearchLinkSketch | null {
  if (fromCardId === toCardId) return null;

  const session = getActiveBoardSession();
  const fromExists = session.cards.some((card) => card.id === fromCardId);
  const toExists = session.cards.some((card) => card.id === toCardId);
  if (!fromExists || !toExists) return null;

  const duplicate = session.links.some(
    (link) => link.fromCardId === fromCardId && link.toCardId === toCardId,
  );
  if (duplicate) return null;

  const link: ResearchLinkSketch = researchLinkSketchSchema.parse({
    id: createId(),
    fromCardId,
    toCardId,
    label,
  });

  updateActiveSession((current) => ({
    ...current,
    links: [...current.links, link],
  }));

  return link;
}

export function removeBoardLink(linkId: string): void {
  updateActiveSession((session) => ({
    ...session,
    links: session.links.filter((link) => link.id !== linkId),
  }));
}

export function importEvidenceCardsToBoard(cards: ResearchCardSketch[]): ResearchCardSketch[] {
  const session = getActiveBoardSession();
  const startIndex = session.cards.length;
  const imported = cards.map((card, offset) => cloneCardForBoard(card, startIndex + offset));

  updateActiveSession((current) => {
    const threadIds = [...current.threadIds];
    for (const card of imported) {
      if (card.threadId && !threadIds.includes(card.threadId)) {
        threadIds.push(card.threadId);
      }
    }
    const nextCards = [...current.cards, ...imported];
    return {
      ...current,
      cards: nextCards,
      threadIds,
      reel: appendReelBeatsForCardsPure(
        current.reel,
        nextCards,
        imported.map((card) => card.id),
        createId,
      ),
    };
  });

  return imported;
}

export type AppendReelBeatInput = {
  cardId: string;
  label?: string;
  allowDuplicate?: boolean;
};

export function appendReelBeat(input: AppendReelBeatInput): ResearchReelBeatSketch | null {
  const session = getActiveBoardSession();
  const nextReel = appendReelBeatPure(session.reel, session.cards, {
    ...input,
    createId,
  });
  if (nextReel.length === session.reel.length) return null;

  updateActiveSession((current) => ({
    ...current,
    reel: nextReel,
  }));

  return nextReel[nextReel.length - 1] ?? null;
}

export function removeReelBeat(beatId: string): void {
  updateActiveSession((session) => ({
    ...session,
    reel: removeReelBeatPure(session.reel, beatId),
  }));
}

export function reorderReelBeats(orderedBeatIds: string[]): void {
  updateActiveSession((session) => ({
    ...session,
    reel: reorderReelBeatsPure(session.reel, orderedBeatIds),
  }));
}

export function clearReel(): void {
  updateActiveSession((session) => ({
    ...session,
    reel: [],
  }));
}

export function clearResearchBoardSessionForTests(): void {
  cachedDoc = null;
  cachedSessionSnapshot = null;
  cachedSummariesSnapshot = null;
  if (!canUseStorage()) return;
  window.localStorage.removeItem(RESEARCH_SESSIONS_STORAGE_KEY);
  notify();
}
