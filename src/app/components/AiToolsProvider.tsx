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
import { createFetchTradingPort } from "@/lib/ai/tradingPort";
import { createFetchJournalPort } from "@/lib/ai/journalPort";
import { createFetchAlertsPort } from "@/lib/ai/alertsPort";
import { clientToolRegistry } from "@/lib/ai/tools/clientTools";
import {
  createInAppAiTools,
  type InAppAiTools,
} from "@/lib/ai/adapters/inApp";
import { useAppActions } from "./AppActionsContext";
import { useActiveChartBridge } from "./ActiveChartContext";
import { useChartActions } from "./ChartActionsContext";
import { useWatchlistActions } from "./watchlist/WatchlistContext";
import { useScreenerStateOptional } from "./screener/ScreenerProvider";
import { useRiskSettingsOptional } from "./RiskSettingsProvider";
import { useAccountOptional } from "./AccountProvider";
import { useOptionsSessionOptional } from "./options/OptionsSessionProvider";
import { useScriptLibraryOptional } from "@/lib/scriptLibrary/ScriptLibraryContext";
import { buildAccountSnapshot } from "@/lib/brokerage/accountSnapshot";
import { createResearchBoardPort } from "@/lib/research/researchBoardPort";
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
  const risk = useRiskSettingsOptional();
  const account = useAccountOptional();
  const optionsSession = useOptionsSessionOptional();
  const scriptLibrary = useScriptLibraryOptional();
  const marketDataRef = useRef(createFetchMarketDataPort());
  const tradingRef = useRef(createFetchTradingPort());
  const journalRef = useRef(createFetchJournalPort());
  const alertsRef = useRef(createFetchAlertsPort());
  const researchRef = useRef(createResearchBoardPort());

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
            getLastRun: () => screener.session.lastRun,
          }
        : null,
      risk: risk
        ? {
            getRiskSettings: () => ({
              settings: risk.settings,
              dollarRisk: risk.dollarRisk,
              basisStale: risk.basisStale,
            }),
          }
        : null,
      account: account
        ? {
            getSnapshot: () =>
              buildAccountSnapshot(
                account.connectionState,
                account.disabled,
                account.error,
                {
                  status: account.status,
                  summary: account.summary,
                  positions: account.positions,
                  pnl: account.pnl,
                  orders: account.orders,
                  executions: account.executions,
                },
              ),
          }
        : null,
      options: optionsSession
        ? {
            getSession: () => ({
              ...optionsSession.state,
              symbol: optionsSession.scope.symbol,
              primaryExpiration: optionsSession.scope.expiration,
              legCount: optionsSession.state.calculator.legs.length,
            }),
          }
        : null,
      scriptLibrary: scriptLibrary
        ? {
            isHydrated: scriptLibrary.isHydrated,
            getError: scriptLibrary.getError,
            getState: scriptLibrary.getState,
            createScript: scriptLibrary.createScript,
            renameScript: scriptLibrary.renameScript,
            duplicateScript: scriptLibrary.duplicateScript,
            deleteScript: scriptLibrary.deleteScript,
            saveDraft: scriptLibrary.saveDraft,
            saveRevision: scriptLibrary.saveRevision,
            getScript: scriptLibrary.getScript,
            getRevisionSource: scriptLibrary.getRevisionSource,
            getRevisionManifest: scriptLibrary.getRevisionManifest,
          }
        : null,
      marketData: marketDataRef.current,
      trading: tradingRef.current,
      journal: journalRef.current,
      alerts: alertsRef.current,
      research: app ? researchRef.current : null,
    };
  }, [app, chartBridge, chartActions, watchlist, screener, risk, account, optionsSession, scriptLibrary]);

  const tools = useMemo(
    () => createInAppAiTools(clientToolRegistry, getContext),
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
