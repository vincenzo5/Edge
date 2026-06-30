"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { ToolContext } from "@/lib/ai/context";
import { createFetchMarketDataPort } from "@/lib/ai/marketDataPort";
import { edgeToolRegistry } from "@/lib/ai/tools";
import {
  createInAppAiTools,
  type InAppAiTools,
} from "@/lib/ai/adapters/inApp";
import { useAppActions } from "./AppActionsContext";
import { useActiveChartBridge } from "./ActiveChartContext";
import { useChartActions } from "./ChartActionsContext";
import { useWatchlistActions } from "./watchlist/WatchlistContext";
import { useScreenerStateOptional } from "./screener/ScreenerProvider";
import type { ExecuteToolOptions, ToolResult } from "@/lib/ai/types";

export type AiToolsContextValue = InAppAiTools & {
  getContext: () => ToolContext;
};

const AiToolsContext = createContext<AiToolsContextValue | null>(null);

export function AiToolsProvider({ children }: { children: ReactNode }) {
  const app = useAppActions();
  const chartBridge = useActiveChartBridge();
  const chartActions = useChartActions();
  const watchlist = useWatchlistActions();
  const screener = useScreenerStateOptional();
  const marketDataRef = useRef(createFetchMarketDataPort());

  const getContext = useCallback((): ToolContext => {
    return {
      clientSession: Boolean(app),
      app,
      chart: chartActions
        ? {
            getActiveChart: () => chartBridge?.getSnapshot() ?? null,
            loadSymbolIntoActiveChart: chartActions.loadSymbolIntoActiveChart,
          }
        : null,
      watchlist: watchlist
        ? {
            getState: watchlist.getState,
            setState: watchlist.setState,
          }
        : null,
      screener: screener
        ? {
            getState: () => screener.state,
            getLastRun: () => screener.lastRun,
          }
        : null,
      marketData: marketDataRef.current,
    };
  }, [app, chartBridge, chartActions, watchlist, screener]);

  const tools = useMemo(
    () => createInAppAiTools(edgeToolRegistry, getContext),
    [getContext],
  );

  const value = useMemo(
    (): AiToolsContextValue => ({
      ...tools,
      getContext,
    }),
    [tools, getContext],
  );

  return (
    <AiToolsContext.Provider value={value}>
      {children}
    </AiToolsContext.Provider>
  );
}

export function useAiTools(): AiToolsContextValue | null {
  return useContext(AiToolsContext);
}

export function useExecuteAiTool(): (
  toolName: string,
  input: unknown,
  options?: ExecuteToolOptions,
) => Promise<ToolResult> {
  const ai = useAiTools();
  return useCallback(
    (toolName, input, options) => {
      if (!ai) {
        return Promise.resolve({
          ok: false,
          error: "AI tools unavailable",
          code: "execution" as const,
        });
      }
      return ai.execute(toolName, input, options);
    },
    [ai],
  );
}
