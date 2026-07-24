import { z } from "zod";
import { compileScriptService } from "@edge/indicator-runtime";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import type { ScriptLibraryPort, ToolContext } from "../context";
import { getScriptAuthoringContext } from "../scriptAuthoringContext";
import {
  cellCountFor,
  createScriptIndicatorInstance,
  type ChartLayout,
} from "@/lib/chartConfig";
import {
  countScriptUsage,
  getRevisionManifest,
  getRevisionSource,
  getScript,
  listScripts,
} from "@/lib/scriptLibrary/repository";
import { normalizeScriptSource } from "@/lib/scriptLibrary/hash";
import { scriptInstanceNameForScript } from "@/lib/scriptLibrary/types";
import { getCell, requireApp } from "./_helpers";
import { cellIndexSchema } from "../schemas";
import { sanitizeIndicatorForAi } from "./indicatorSanitizer";

function requireScriptLibrary(context: ToolContext): ScriptLibraryPort {
  if (!context.scriptLibrary) {
    throw new Error("Script library unavailable");
  }
  if (!context.scriptLibrary.isHydrated()) {
    throw new Error("Script library not hydrated");
  }
  const err = context.scriptLibrary.getError();
  if (err) {
    throw new Error(err);
  }
  return context.scriptLibrary;
}

function countScriptUsageInLayout(layout: ChartLayout, scriptId: string): number {
  let total = 0;
  const cellCount = cellCountFor(layout.layoutId);
  for (let i = 0; i < cellCount; i++) {
    total += countScriptUsage(layout.cells[i]?.indicators ?? [], scriptId);
  }
  return total;
}

function resolveEntrySource(
  context: ToolContext,
  scriptId: string,
  revision?: string,
): { source: string; revision: string | null } | null {
  const library = requireScriptLibrary(context);
  const state = library.getState();
  const entry = getScript(state, scriptId);
  if (!entry) return null;

  if (revision) {
    const record = getRevisionSource(state, scriptId, revision);
    if (!record) return null;
    return { source: record.source, revision: record.revision };
  }

  if (entry.draft?.source) {
    return { source: entry.draft.source, revision: entry.headRevision };
  }

  if (entry.headRevision) {
    const record = getRevisionSource(state, entry.scriptId, entry.headRevision);
    if (!record) return null;
    return { source: record.source, revision: record.revision };
  }

  return null;
}

function toScriptListItem(entry: ReturnType<typeof listScripts>[number]) {
  const headRecord = entry.headRevision
    ? entry.revisions.find((rev) => rev.revision === entry.headRevision)
    : undefined;
  return {
    scriptId: entry.scriptId,
    displayName: entry.displayName,
    headRevision: entry.headRevision,
    updatedAt: entry.updatedAt,
    dirty: entry.draft?.dirty ?? false,
    hasDraft: Boolean(entry.draft),
    compileOk: headRecord?.compileOk ?? false,
  };
}

export const listIndicatorScriptsTool = defineTool({
  name: "list_indicator_scripts",
  description:
    "List private My scripts metadata (id, name, revision, compile status). Does not return source code.",
  inputSchema: z.object({}),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(_input, context) {
    const library = requireScriptLibrary(context);
    const scripts = listScripts(library.getState()).map(toScriptListItem);
    return { ok: true, data: { scripts } };
  },
});

export const getIndicatorScriptTool = defineTool({
  name: "get_indicator_script",
  description:
    "Read a private script source, manifest summary, and authoring context for repair or editing.",
  inputSchema: z.object({
    scriptId: z.string().min(1),
    revision: z.string().min(1).optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const library = requireScriptLibrary(context);
    const state = library.getState();
    const entry = getScript(state, input.scriptId);
    if (!entry) {
      return {
        ok: false,
        error: `Script not found: ${input.scriptId}`,
        code: "execution",
      };
    }

    const resolved = resolveEntrySource(context, input.scriptId, input.revision);
    if (!resolved) {
      return {
        ok: false,
        error: input.revision
          ? `Revision not found: ${input.revision}`
          : "Script has no draft or saved revision",
        code: "execution",
      };
    }

    const manifest =
      (input.revision
        ? getRevisionManifest(state, input.scriptId, input.revision)
        : entry.draft?.manifest ??
          (entry.headRevision
            ? getRevisionManifest(state, input.scriptId, entry.headRevision)
            : undefined)) ?? undefined;

    return {
      ok: true,
      data: {
        scriptId: entry.scriptId,
        displayName: entry.displayName,
        headRevision: entry.headRevision,
        revision: input.revision ?? entry.headRevision,
        source: resolved.source,
        manifest: manifest
          ? {
              name: manifest.name,
              pane: manifest.pane,
              inputKeys: Object.keys(manifest.inputs),
              plotKeys: Object.keys(manifest.plots),
            }
          : null,
        authoringContext: getScriptAuthoringContext(),
      },
    };
  },
});

export const createIndicatorScriptTool = defineTool({
  name: "create_indicator_script",
  description: "Create a new private My script with optional display name and initial source.",
  inputSchema: z.object({
    displayName: z.string().trim().optional(),
    source: z.string().optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const library = requireScriptLibrary(context);
    try {
      const created = await library.createScript({
        displayName: input.displayName,
        source: input.source,
      });
      return {
        ok: true,
        data: {
          script: toScriptListItem(created),
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create script",
        code: "execution",
      };
    }
  },
});

export const updateIndicatorScriptTool = defineTool({
  name: "update_indicator_script",
  description: "Rename a private script and/or update its draft source.",
  inputSchema: z.object({
    scriptId: z.string().min(1),
    displayName: z.string().trim().min(1).optional(),
    source: z.string().optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const library = requireScriptLibrary(context);
    const state = library.getState();
    if (!getScript(state, input.scriptId)) {
      return {
        ok: false,
        error: `Script not found: ${input.scriptId}`,
        code: "execution",
      };
    }
    if (!input.displayName && input.source === undefined) {
      return {
        ok: false,
        error: "Provide displayName and/or source",
        code: "validation",
      };
    }

    try {
      if (input.displayName) {
        await library.renameScript(input.scriptId, input.displayName);
      }
      if (input.source !== undefined) {
        await library.saveDraft(input.scriptId, normalizeScriptSource(input.source), true);
      }

      const entry = library.getScript(input.scriptId);
      if (!entry) {
        return { ok: false, error: "Script not found after update", code: "execution" };
      }

      return {
        ok: true,
        data: {
          script: toScriptListItem(entry),
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update script",
        code: "execution",
      };
    }
  },
});

export const compileIndicatorScriptTool = defineTool({
  name: "compile_indicator_script",
  description:
    "Compile private script source and return diagnostics plus authoring context. Optionally persist a saved revision when compile succeeds.",
  inputSchema: z
    .object({
      scriptId: z.string().min(1).optional(),
      source: z.string().optional(),
      persistRevision: z.boolean().optional(),
    })
    .refine((input) => Boolean(input.scriptId || input.source), {
      message: "Provide scriptId or source",
    }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const library = requireScriptLibrary(context);
    let source = input.source;

    if (input.scriptId) {
      const resolved = resolveEntrySource(context, input.scriptId, undefined);
      if (!resolved) {
        return {
          ok: false,
          error: `Script not found or has no source: ${input.scriptId}`,
          code: "execution",
        };
      }
      source = input.source ?? resolved.source;
    }

    if (!source) {
      return { ok: false, error: "No source to compile", code: "validation" };
    }

    const normalized = normalizeScriptSource(source);
    const compile = compileScriptService({ source: normalized });
    const authoringContext = getScriptAuthoringContext();

    if (input.scriptId) {
      try {
        await library.saveDraft(input.scriptId, normalized, true, compile.manifest);
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to save draft",
          code: "execution",
        };
      }
    }

    let revision: string | null = null;
    if (input.persistRevision && compile.ok && input.scriptId) {
      try {
        revision = await library.saveRevision(input.scriptId, {
          source: normalized,
          compile,
        });
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to persist revision",
          code: "execution",
        };
      }
    }

    return {
      ok: true,
      data: {
        scriptId: input.scriptId ?? null,
        ok: compile.ok,
        diagnostics: compile.diagnostics,
        manifest: compile.manifest
          ? {
              name: compile.manifest.name,
              pane: compile.manifest.pane,
              inputKeys: Object.keys(compile.manifest.inputs),
              plotKeys: Object.keys(compile.manifest.plots),
            }
          : null,
        languageVersion: compile.languageVersion ?? authoringContext.languageVersion,
        sdkVersion: compile.sdkVersion ?? authoringContext.sdkVersion,
        revision,
        authoringContext,
      },
    };
  },
});

export const applyIndicatorScriptTool = defineTool({
  name: "apply_indicator_script",
  description:
    "Add a saved private script to a chart cell as a script indicator instance.",
  inputSchema: z.object({
    scriptId: z.string().min(1),
    revision: z.string().min(1).optional(),
    cellIndex: cellIndexSchema,
    pane: z.enum(["main", "sub"]).optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const app = requireApp(context);
    const library = requireScriptLibrary(context);
    const state = library.getState();
    const entry = getScript(state, input.scriptId);
    if (!entry) {
      return {
        ok: false,
        error: `Script not found: ${input.scriptId}`,
        code: "execution",
      };
    }

    const revision = input.revision ?? entry.headRevision;
    if (!revision) {
      return {
        ok: false,
        error: "Script has no saved revision — compile with persistRevision first",
        code: "execution",
      };
    }

    const manifest = getRevisionManifest(state, input.scriptId, revision);
    const pane = input.pane ?? manifest?.pane ?? "main";
    const { index, cell } = getCell(context, input.cellIndex);
    const instance = createScriptIndicatorInstance({
      scriptId: input.scriptId,
      revision,
      name: scriptInstanceNameForScript(input.scriptId),
      pane,
    });

    app.applyCellUpdate(index, {
      ...cell,
      indicators: [...cell.indicators, instance],
    });

    return {
      ok: true,
      data: {
        cellIndex: index,
        indicator: sanitizeIndicatorForAi(instance),
        displayName: entry.displayName,
        revision,
      },
    };
  },
});

export const deleteIndicatorScriptTool = defineTool({
  name: "delete_indicator_script",
  description:
    "Delete a private My script by id. Requires explicit confirmation when used through the tool executor.",
  inputSchema: z.object({ scriptId: z.string().min(1) }),
  permission: "destructive",
  requiresConfirmation: true,
  requiresClientSession: true,
  async execute(input, context) {
    const app = requireApp(context);
    const library = requireScriptLibrary(context);
    const state = library.getState();
    const entry = getScript(state, input.scriptId);
    if (!entry) {
      return {
        ok: false,
        error: `Script not found: ${input.scriptId}`,
        code: "execution",
      };
    }

    const usageCount = countScriptUsageInLayout(app.getLayout(), input.scriptId);
    try {
      await library.deleteScript(input.scriptId);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to delete script",
        code: "execution",
      };
    }

    return {
      ok: true,
      data: {
        deletedScriptId: input.scriptId,
        displayName: entry.displayName,
        usageCount,
      },
    };
  },
});

export const indicatorScriptTools: AiTool[] = [
  listIndicatorScriptsTool,
  getIndicatorScriptTool,
  createIndicatorScriptTool,
  updateIndicatorScriptTool,
  compileIndicatorScriptTool,
  applyIndicatorScriptTool,
  deleteIndicatorScriptTool,
];
