import { z } from "zod";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import { buildAccountSnapshot } from "@/lib/brokerage/accountSnapshot";

export const getRiskSettingsTool = defineTool({
  name: "get_risk_settings",
  description:
    "Read the user's risk sizing settings and resolved dollar risk for the active session.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(_input, context) {
    if (!context.risk) {
      throw new Error("Risk settings unavailable");
    }
    return {
      ok: true,
      data: context.risk.getRiskSettings(),
    };
  },
});

export const getAccountSnapshotTool = defineTool({
  name: "get_account_snapshot",
  description:
    "Read the current brokerage account snapshot: connection state, summary, positions, orders, and executions.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(_input, context) {
    if (!context.account) {
      throw new Error("Account snapshot unavailable");
    }
    return {
      ok: true,
      data: context.account.getSnapshot(),
    };
  },
});

export const getOptionsSessionTool = defineTool({
  name: "get_options_session",
  description:
    "Read the in-memory options workspace session: active tab, calculator legs, and chain scope for the focused symbol.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(_input, context) {
    if (!context.options) {
      throw new Error("Options session unavailable");
    }
    return {
      ok: true,
      data: context.options.getSession(),
    };
  },
});

export const sessionStateTools: AiTool[] = [
  getRiskSettingsTool,
  getAccountSnapshotTool,
  getOptionsSessionTool,
];
