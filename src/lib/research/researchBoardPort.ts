import {
  addBoardCard,
  addBoardLink,
  getActiveBoardSession,
  removeBoardCard,
  updateBoardCardPosition,
} from "./boardSessionStore";
import {
  clearBoardFocusForTests,
  getBoardFocusedCardId,
  setBoardFocusedCardId,
} from "./boardFocusStore";
import type { ResearchCardSketch, ResearchLinkSketch, ResearchSessionSketch } from "./sessionSketch";
import { researchCardSketchSchema } from "./sessionSketch";

export type ResearchBoardCardInput = Omit<ResearchCardSketch, "id" | "source"> & {
  id?: string;
  source?: ResearchCardSketch["source"];
};

export type ResearchBoardArrangeUpdate = {
  cardId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type ResearchBoardPort = {
  getSession: () => ResearchSessionSketch;
  getFocusedCardId: () => string | null;
  addCard: (input: ResearchBoardCardInput) => ResearchCardSketch;
  addLink: (
    fromCardId: string,
    toCardId: string,
    label?: string,
  ) => ResearchLinkSketch | null;
  removeCard: (cardId: string) => void;
  arrangeCards: (updates: ResearchBoardArrangeUpdate[]) => void;
  focusCard: (cardId: string | null) => void;
};

function createCardId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createResearchBoardPort(): ResearchBoardPort {
  return {
    getSession: () => getActiveBoardSession(),
    getFocusedCardId: () => getBoardFocusedCardId(),
    addCard(input) {
      const card = researchCardSketchSchema.parse({
        ...input,
        id: input.id ?? createCardId(),
        source: input.source ?? "ai",
      });
      return addBoardCard(card);
    },
    addLink(fromCardId, toCardId, label) {
      return addBoardLink(fromCardId, toCardId, label);
    },
    removeCard(cardId) {
      removeBoardCard(cardId);
      if (getBoardFocusedCardId() === cardId) {
        setBoardFocusedCardId(null);
      }
    },
    arrangeCards(updates) {
      for (const update of updates) {
        updateBoardCardPosition(update.cardId, {
          x: update.x,
          y: update.y,
          width: update.width,
          height: update.height,
        });
      }
    },
    focusCard(cardId) {
      if (cardId === null) {
        setBoardFocusedCardId(null);
        return;
      }
      const exists = getActiveBoardSession().cards.some((card) => card.id === cardId);
      if (!exists) {
        throw new Error(`Research board card not found: ${cardId}`);
      }
      setBoardFocusedCardId(cardId);
    },
  };
}

export { clearBoardFocusForTests };
