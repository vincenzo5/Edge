import { z } from "zod";

import type { ToolContext } from "../context";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import { researchCardPositionSketchSchema } from "@/lib/research/sessionSketch";

function requireResearch(context: ToolContext) {
  if (!context.research) {
    throw new Error("Research board unavailable");
  }
  return context.research;
}

const provenanceFields = {
  threadId: z.string().min(1).optional(),
  messageId: z.string().min(1).optional(),
};

const researchCardInputSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("chart"),
      symbol: z.string().trim().min(1).max(16),
      interval: z.string().min(1).max(8),
      position: researchCardPositionSketchSchema.optional(),
    })
    .extend(provenanceFields),
  z
    .object({
      type: z.literal("screener"),
      savedScreenId: z.string().uuid().optional(),
      queryLabel: z.string().trim().min(1).max(120).optional(),
      position: researchCardPositionSketchSchema.optional(),
    })
    .extend(provenanceFields),
  z
    .object({
      type: z.literal("note"),
      title: z.string().trim().max(200).optional(),
      body: z.string().trim().min(1).max(10_000),
      position: researchCardPositionSketchSchema.optional(),
    })
    .extend(provenanceFields),
  z
    .object({
      type: z.literal("journalDraft"),
      draftTradeId: z.string().uuid().optional(),
      summary: z.string().trim().max(500).optional(),
      position: researchCardPositionSketchSchema.optional(),
    })
    .extend(provenanceFields),
  z.object({
    type: z.literal("aiCallout"),
    summary: z.string().trim().min(1).max(2000),
    threadId: z.string().min(1),
    messageId: z.string().min(1).optional(),
    position: researchCardPositionSketchSchema.optional(),
  }),
  z
    .object({
      type: z.literal("deskLink"),
      appWorkspaceId: z.string().min(1).optional(),
      tileId: z.string().min(1).optional(),
      label: z.string().trim().max(120).optional(),
      position: researchCardPositionSketchSchema.optional(),
    })
    .extend(provenanceFields),
  z
    .object({
      type: z.literal("researchRun"),
      jobId: z.string().trim().min(1).max(64),
      runFingerprint: z.string().trim().min(1).max(128),
      datasetId: z.string().trim().min(1).max(64).optional(),
      toolName: z.string().trim().min(1).max(64),
      summary: z.string().trim().min(1).max(2000),
      keyMetrics: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
      position: researchCardPositionSketchSchema.optional(),
    })
    .extend(provenanceFields),
]);

export const getResearchBoardTool = defineTool({
  name: "get_research_board",
  description:
    "Read the active Research Board session: cards, links, title, and focused card id.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(_input, context) {
    const board = requireResearch(context);
    return {
      ok: true,
      data: {
        session: board.getSession(),
        focusedCardId: board.getFocusedCardId(),
      },
    };
  },
});

export const addResearchCardTool = defineTool({
  name: "add_research_card",
  description:
    "Add a card to the Research Board (chart, screener, note, journal draft, AI callout, research run, or desk link). Marks source as ai.",
  inputSchema: researchCardInputSchema,
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const board = requireResearch(context);
    const card = board.addCard({
      ...input,
      source: "ai",
    });
    return { ok: true, data: { card } };
  },
});

export const linkResearchCardsTool = defineTool({
  name: "link_research_cards",
  description: "Create a directed link between two Research Board cards.",
  inputSchema: z.object({
    fromCardId: z.string().uuid(),
    toCardId: z.string().uuid(),
    label: z.string().trim().max(120).optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const board = requireResearch(context);
    const link = board.addLink(input.fromCardId, input.toCardId, input.label);
    if (!link) {
      return {
        ok: false,
        error: "Could not link cards — missing card or duplicate link",
        code: "execution" as const,
      };
    }
    return { ok: true, data: { link } };
  },
});

export const focusResearchCardTool = defineTool({
  name: "focus_research_card",
  description:
    "Focus a Research Board card (e.g. to mount its live chart). Pass null to clear focus.",
  inputSchema: z.object({
    cardId: z.string().uuid().nullable(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const board = requireResearch(context);
    board.focusCard(input.cardId);
    return {
      ok: true,
      data: { focusedCardId: board.getFocusedCardId() },
    };
  },
});

export const arrangeResearchCardsTool = defineTool({
  name: "arrange_research_cards",
  description:
    "Bulk update positions for Research Board cards. Requires user confirmation.",
  inputSchema: z.object({
    cards: z
      .array(
        z.object({
          cardId: z.string().uuid(),
          x: z.number(),
          y: z.number(),
          width: z.number().positive().optional(),
          height: z.number().positive().optional(),
        }),
      )
      .min(1)
      .max(256),
  }),
  permission: "write",
  requiresConfirmation: true,
  requiresClientSession: true,
  async execute(input, context) {
    const board = requireResearch(context);
    const session = board.getSession();
    const knownIds = new Set(session.cards.map((card) => card.id));
    for (const update of input.cards) {
      if (!knownIds.has(update.cardId)) {
        return {
          ok: false,
          error: `Unknown card id: ${update.cardId}`,
          code: "execution" as const,
        };
      }
    }
    board.arrangeCards(input.cards);
    return {
      ok: true,
      data: {
        updatedCount: input.cards.length,
        session: board.getSession(),
      },
    };
  },
});

export const removeResearchCardTool = defineTool({
  name: "remove_research_card",
  description:
    "Remove a card from the Research Board and its connected links. Requires user confirmation.",
  inputSchema: z.object({
    cardId: z.string().uuid(),
  }),
  permission: "destructive",
  requiresConfirmation: true,
  requiresClientSession: true,
  async execute(input, context) {
    const board = requireResearch(context);
    const exists = board.getSession().cards.some((card) => card.id === input.cardId);
    if (!exists) {
      return {
        ok: false,
        error: `Unknown card id: ${input.cardId}`,
        code: "execution" as const,
      };
    }
    board.removeCard(input.cardId);
    return {
      ok: true,
      data: { removedCardId: input.cardId, session: board.getSession() },
    };
  },
});

export const researchTools: AiTool[] = [
  getResearchBoardTool,
  addResearchCardTool,
  linkResearchCardsTool,
  focusResearchCardTool,
  arrangeResearchCardsTool,
  removeResearchCardTool,
];
