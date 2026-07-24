import { z } from "zod";

import type { ResearchCardSketch, ResearchLinkSketch, ResearchSessionSketch } from "./sessionSketch";
import {
  RESEARCH_SESSION_SKETCH_VERSION,
  RESEARCH_SESSIONS_STORAGE_KEY,
  researchCardSketchSchema,
  researchLinkSketchSchema,
  researchSessionSketchSchema,
} from "./sessionSketch";

const BOARD_SESSIONS_DOC_VERSION = 1 as const;

const boardSessionsDocSchema = z.object({
  schemaVersion: z.literal(BOARD_SESSIONS_DOC_VERSION),
  activeSessionId: z.string().uuid(),
  sessions: z.array(researchSessionSketchSchema).max(1),
});

type BoardSessionsDoc = z.infer<typeof boardSessionsDocSchema>;

const listeners = new Set<() => void>();

let cachedDoc: BoardSessionsDoc | null = null;
let cachedSessionSnapshot: ResearchSessionSketch | null = null;

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

function createDefaultSession(): ResearchSessionSketch {
  const id = createId();
  return {
    id,
    schemaVersion: RESEARCH_SESSION_SKETCH_VERSION,
    title: "Research session",
    cards: [],
    links: [],
    threadIds: [],
    reel: [],
    updatedAt: new Date().toISOString(),
  };
}

function createDefaultDoc(): BoardSessionsDoc {
  const session = createDefaultSession();
  return {
    schemaVersion: BOARD_SESSIONS_DOC_VERSION,
    activeSessionId: session.id,
    sessions: [session],
  };
}

function parseDoc(raw: unknown): BoardSessionsDoc | null {
  const parsed = boardSessionsDocSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
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

function getActiveSessionFromDoc(doc: BoardSessionsDoc): ResearchSessionSketch {
  const session =
    doc.sessions.find((entry) => entry.id === doc.activeSessionId) ?? doc.sessions[0];
  if (session) return session;
  const fallback = createDefaultSession();
  writeDoc({
    schemaVersion: BOARD_SESSIONS_DOC_VERSION,
    activeSessionId: fallback.id,
    sessions: [fallback],
  });
  return fallback;
}

function updateActiveSession(
  updater: (session: ResearchSessionSketch) => ResearchSessionSketch,
): ResearchSessionSketch {
  const doc = readDoc();
  const active = getActiveSessionFromDoc(doc);
  const nextSession = updater({
    ...active,
    updatedAt: new Date().toISOString(),
  });
  const nextDoc: BoardSessionsDoc = {
    schemaVersion: BOARD_SESSIONS_DOC_VERSION,
    activeSessionId: nextSession.id,
    sessions: [nextSession],
  };
  writeDoc(nextDoc);
  notify();
  return nextSession;
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
  cachedSessionSnapshot = getActiveSessionFromDoc(readDoc());
  return cachedSessionSnapshot;
}

export function addBoardCard(card: ResearchCardSketch): ResearchCardSketch {
  const session = getActiveBoardSession();
  const index = session.cards.length;
  const withPosition: ResearchCardSketch = researchCardSketchSchema.parse({
    ...card,
    position: card.position ?? defaultPosition(index, card),
  });

  updateActiveSession((current) => ({
    ...current,
    cards: [...current.cards, withPosition],
    threadIds:
      withPosition.threadId && !current.threadIds.includes(withPosition.threadId)
        ? [...current.threadIds, withPosition.threadId]
        : current.threadIds,
  }));

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
    return {
      ...current,
      cards: [...current.cards, ...imported],
      threadIds,
    };
  });

  return imported;
}

export function clearResearchBoardSessionForTests(): void {
  cachedDoc = null;
  cachedSessionSnapshot = null;
  if (!canUseStorage()) return;
  window.localStorage.removeItem(RESEARCH_SESSIONS_STORAGE_KEY);
  notify();
}
