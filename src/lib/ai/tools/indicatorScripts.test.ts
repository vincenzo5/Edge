import { describe, expect, it, vi } from "vitest";
import { executeTool } from "../adapters/execute";
import { clientToolRegistry } from "./clientTools";
import type { ScriptLibraryPort, ToolContext } from "../context";
import type { ChartLayout } from "@/lib/chartConfig";
import {
  DEFAULT_SCRIPT_LIBRARY_STATE,
  DEFAULT_SCRIPT_TEMPLATE,
  type ScriptLibraryState,
} from "@/lib/scriptLibrary/types";
import {
  createScript,
  deleteScript,
  getRevisionManifest,
  getRevisionSource,
  getScript,
  renameScript,
  saveDraft,
  saveRevision,
} from "@/lib/scriptLibrary/repository";
import { compileScriptService } from "@edge/indicator-runtime";
import {
  applyIndicatorScriptTool,
  compileIndicatorScriptTool,
  createIndicatorScriptTool,
  deleteIndicatorScriptTool,
  getIndicatorScriptTool,
  listIndicatorScriptsTool,
  updateIndicatorScriptTool,
} from "./indicatorScripts";
import { getChartStateTool } from "./chart";
import { listIndicatorsTool } from "./indicators";
import { summarizeChartTool } from "./workflow";

function createScriptLibraryPort(
  initial: ScriptLibraryState = DEFAULT_SCRIPT_LIBRARY_STATE,
): ScriptLibraryPort {
  let state = initial;
  return {
    getState: () => state,
    isHydrated: () => true,
    getError: () => null,
    createScript: async (params) => {
      const result = createScript(state, params);
      state = result.state;
      return result.entry;
    },
    renameScript: async (scriptId, displayName) => {
      state = renameScript(state, scriptId, displayName);
      const entry = getScript(state, scriptId);
      if (!entry) throw new Error("Script not found");
      return entry;
    },
    duplicateScript: async (scriptId) => {
      const sourceEntry = getScript(state, scriptId);
      if (!sourceEntry) return null;
      const draftSource =
        sourceEntry.draft?.source ??
        sourceEntry.revisions.find((rev) => rev.revision === sourceEntry.headRevision)?.source;
      if (!draftSource) return null;
      const result = createScript(state, {
        displayName: `${sourceEntry.displayName} copy`,
        source: draftSource,
      });
      state = result.state;
      return result.entry;
    },
    deleteScript: async (scriptId) => {
      state = deleteScript(state, scriptId);
    },
    saveDraft: async (scriptId, source, dirty = true, manifest) => {
      state = saveDraft(state, scriptId, { source, dirty, manifest });
    },
    saveRevision: async (scriptId, params) => {
      const result = saveRevision(state, scriptId, params);
      if (!result) throw new Error("Failed to save revision");
      state = result.state;
      return result.revision;
    },
    getScript: (scriptId) => getScript(state, scriptId),
    getRevisionSource: (scriptId, revision) => getRevisionSource(state, scriptId, revision),
    getRevisionManifest: (scriptId, revision) => getRevisionManifest(state, scriptId, revision),
  };
}

function createLayout(overrides: Partial<ChartLayout> = {}): ChartLayout {
  return {
    version: 1,
    layoutId: "n2-rows",
    linkSymbol: false,
    linkInterval: false,
    linkCrosshair: false,
    linkDrawings: false,
    theme: "dark",
    activeCellIndex: 0,
    cells: [
      {
        symbol: "AAPL",
        range: "1y",
        interval: "1d",
        chartType: "candle_solid",
        indicators: [],
        drawings: [],
      },
      {
        symbol: "MSFT",
        range: "6mo",
        interval: "1d",
        chartType: "ohlc",
        indicators: [],
        drawings: [],
      },
    ],
    toolbarPrefs: {},
    sidebar: { activePanel: "object-tree" },
    ...overrides,
  };
}

function createContext(
  overrides: Partial<ToolContext> & {
    layout?: ChartLayout;
    scriptLibrary?: ScriptLibraryPort;
  } = {},
): ToolContext {
  const layout = overrides.layout ?? createLayout();
  const scriptLibrary = overrides.scriptLibrary ?? createScriptLibraryPort();
  const { layout: _layout, scriptLibrary: _scriptLibrary, ...rest } = overrides;
  return {
    clientSession: true,
    app: {
      getLayout: () => layout,
      isHydrated: () => true,
      applyCellUpdate: vi.fn(),
      patchActiveCell: vi.fn(),
      setActiveCellIndex: vi.fn(),
      setLayoutId: vi.fn(),
      setGridMode: vi.fn(),
      setLayoutSync: vi.fn(),
      setTheme: vi.fn(),
      setSidebarPanel: vi.fn(),
    },
    chart: {
      getActiveChart: () => ({
        overlays: [],
        dataWindow: null,
        chartCommands: { getCandles: () => [] },
      }),
      loadSymbolIntoActiveChart: vi.fn(),
    },
    watchlist: null,
    screener: null,
    risk: null,
    account: null,
    options: null,
    scriptLibrary,
    marketData: {
      searchSymbols: async () => [],
      getCandles: async () => ({ data: [], meta: { source: "test" } }),
      getQuotes: async () => ({ data: [], meta: { source: "test" } }),
      getFundamentals: async () => ({ symbol: "AAPL", updatedAt: Date.now() }),
      getOptionExpirations: async () => [],
      getOptionsChain: async () => ({
        underlying: "AAPL",
        expiration: "2025-06-20",
        contracts: [],
      }),
    },
    trading: null,
    journal: null,
    alerts: null,
    ...rest,
  };
}

describe("indicator script AI tools", () => {
  it("lists scripts without source", async () => {
    const created = createScript(DEFAULT_SCRIPT_LIBRARY_STATE, {
      displayName: "Alpha",
      source: DEFAULT_SCRIPT_TEMPLATE,
    });
    const ctx = createContext({
      scriptLibrary: createScriptLibraryPort(created.state),
    });

    const result = await listIndicatorScriptsTool.execute({}, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.scripts).toHaveLength(1);
    expect(result.data.scripts[0]).toMatchObject({
      scriptId: created.entry.scriptId,
      displayName: "Alpha",
      dirty: true,
    });
    expect(JSON.stringify(result.data)).not.toContain("function edgeScript");
  });

  it("creates, updates, compiles, persists, and applies a script", async () => {
    const port = createScriptLibraryPort();
    const ctx = createContext({ scriptLibrary: port });

    const created = await createIndicatorScriptTool.execute(
      { displayName: "SMA Mid" },
      ctx,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const scriptId = created.data.script.scriptId;

    const updated = await updateIndicatorScriptTool.execute(
      {
        scriptId,
        source: DEFAULT_SCRIPT_TEMPLATE.replace("My Indicator", "Mid SMA"),
      },
      ctx,
    );
    expect(updated.ok).toBe(true);

    const compiled = await compileIndicatorScriptTool.execute(
      { scriptId, persistRevision: true },
      ctx,
    );
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.data.ok).toBe(true);
    expect(compiled.data.revision).toBeTruthy();
    expect(compiled.data.authoringContext.sdkVersion).toBeTruthy();

    const applied = await applyIndicatorScriptTool.execute({ scriptId }, ctx);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.data.indicator).toMatchObject({
      kind: "script",
      scriptId,
      revision: compiled.data.revision,
    });
    expect(ctx.app?.applyCellUpdate).toHaveBeenCalled();
  });

  it("returns source and authoring context from get_indicator_script", async () => {
    const created = createScript(DEFAULT_SCRIPT_LIBRARY_STATE, {
      displayName: "Draft",
      source: DEFAULT_SCRIPT_TEMPLATE,
    });
    const ctx = createContext({
      scriptLibrary: createScriptLibraryPort(created.state),
    });

    const result = await getIndicatorScriptTool.execute(
      { scriptId: created.entry.scriptId },
      ctx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.source).toContain("function edgeScript");
    expect(result.data.authoringContext.examples.length).toBeGreaterThan(0);
  });

  it("returns compile diagnostics for invalid source", async () => {
    const created = createScript(DEFAULT_SCRIPT_LIBRARY_STATE);
    const ctx = createContext({
      scriptLibrary: createScriptLibraryPort(created.state),
    });

    const result = await compileIndicatorScriptTool.execute(
      {
        scriptId: created.entry.scriptId,
        source: "function edgeScript() { return { broken",
      },
      ctx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.ok).toBe(false);
    expect(result.data.diagnostics.length).toBeGreaterThan(0);
  });

  it("requires confirmation for delete_indicator_script", async () => {
    const created = createScript(DEFAULT_SCRIPT_LIBRARY_STATE);
    const ctx = createContext({
      scriptLibrary: createScriptLibraryPort(created.state),
    });

    const blocked = await executeTool(
      clientToolRegistry,
      "delete_indicator_script",
      { scriptId: created.entry.scriptId },
      ctx,
      { permissionMode: "full", confirmed: false },
    );
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.code).toBe("confirmation_required");

    const confirmed = await deleteIndicatorScriptTool.execute(
      { scriptId: created.entry.scriptId },
      ctx,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.data.deletedScriptId).toBe(created.entry.scriptId);
    expect(portAfterDelete(ctx).getState().scripts).toHaveLength(0);
  });

  it("reports chart usage count on delete", async () => {
    const created = createScript(DEFAULT_SCRIPT_LIBRARY_STATE);
    const compile = compileScriptService({ source: DEFAULT_SCRIPT_TEMPLATE });
    const saved = saveRevision(created.state, created.entry.scriptId, {
      source: DEFAULT_SCRIPT_TEMPLATE,
      compile,
    });
    expect(saved).not.toBeNull();

    const layout = createLayout({
      cells: [
        {
          ...createLayout().cells[0]!,
          indicators: [
            {
              id: "ind-1",
              kind: "script",
              scriptId: created.entry.scriptId,
              revision: saved!.revision,
              name: "__script_test",
              pane: "main",
              visible: true,
            },
          ],
        },
        createLayout().cells[1]!,
      ],
    });

    const ctx = createContext({
      layout,
      scriptLibrary: createScriptLibraryPort(saved!.state),
    });

    const result = await deleteIndicatorScriptTool.execute(
      { scriptId: created.entry.scriptId },
      ctx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.usageCount).toBe(1);
  });
});

function portAfterDelete(ctx: ToolContext) {
  if (!ctx.scriptLibrary) throw new Error("missing port");
  return ctx.scriptLibrary;
}

describe("script source privacy in generic AI tools", () => {
  const scriptIndicator = {
    id: "ind-script",
    kind: "script" as const,
    scriptId: "script-123",
    revision: "rev-abc",
    name: "__script_script_123",
    pane: "main" as const,
    visible: true,
  };

  it("sanitizes script indicators in get_chart_state", async () => {
    const layout = createLayout({
      cells: [{ ...createLayout().cells[0]!, indicators: [scriptIndicator] }, createLayout().cells[1]!],
    });
    const ctx = createContext({ layout });

    const result = await getChartStateTool.execute({}, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const indicators = result.data.config.indicators ?? [];
    expect(indicators[0]).toMatchObject({
      kind: "script",
      scriptId: "script-123",
      revision: "rev-abc",
    });
    expect(JSON.stringify(indicators[0])).not.toContain("function edgeScript");
  });

  it("sanitizes script indicators in list_indicators", async () => {
    const layout = createLayout({
      cells: [{ ...createLayout().cells[0]!, indicators: [scriptIndicator] }, createLayout().cells[1]!],
    });
    const ctx = createContext({ layout });

    const result = await listIndicatorsTool.execute({}, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.active[0]).toMatchObject({
      kind: "script",
      scriptId: "script-123",
      revision: "rev-abc",
    });
    expect(JSON.stringify(result.data)).not.toContain("function edgeScript");
  });

  it("sanitizes script indicators in summarize_chart", async () => {
    const layout = createLayout({
      cells: [{ ...createLayout().cells[0]!, indicators: [scriptIndicator] }, createLayout().cells[1]!],
    });
    const ctx = createContext({ layout });

    const result = await summarizeChartTool.execute({}, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.stringify(result.data)).toContain("script-123");
    expect(JSON.stringify(result.data)).not.toContain("function edgeScript");
  });
});
