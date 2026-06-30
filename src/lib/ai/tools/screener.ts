import { z } from "zod";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import {
  buildScreenSummary,
  resolveScreenName,
} from "@/lib/screener/summarizeScreen";

export const summarizeScreenTool = defineTool({
  name: "summarize_screen",
  description:
    "Produce a thesis summary for the active or named saved screen: query summary, result count, sector/industry concentration, top movers, shared technical signals, and notable outliers.",
  inputSchema: z.object({
    screenId: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    if (!context.screener) {
      throw new Error("Screener context unavailable");
    }
    const state = context.screener.getState();
    const lastRun = context.screener.getLastRun();
    if (!lastRun || lastRun.rows.length === 0) {
      return {
        ok: true,
        data: {
          screenName: resolveScreenName(state, input.screenId),
          resultCount: 0,
          thesisSummary: "No screener results loaded. Run a screen in the app first.",
          ranked: [],
        },
      };
    }

    const screenName = resolveScreenName(state, input.screenId);
    const summary = buildScreenSummary({
      screenName,
      query: state.query,
      rows: lastRun.rows,
      meta: lastRun.meta,
      limit: input.limit,
    });

    return {
      ok: true,
      data: summary,
    };
  },
});

export const screenerTools: AiTool[] = [summarizeScreenTool];
