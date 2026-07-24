"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChartActions } from "@/app/components/ChartActionsContext";
import { useAppActions } from "@/app/components/AppActionsContext";
import { useAppChromeActions } from "@/app/components/home/AppChromeActionsProvider";
import {
  consumePendingWorkspaceActions,
  queuePendingChartSymbol,
  queuePendingSidebarPanel,
} from "@/lib/app/pendingWorkspaceActions";
import type { AppActions } from "@/lib/ai/context";

type Props = {
  appActions: AppActions;
  loadSymbolIntoActiveChart: (result: {
    symbol: string;
    name: string;
    exchange: string;
  }) => void;
};

export default function OpenRiskWorkspaceBridge({ appActions, loadSymbolIntoActiveChart }: Props) {
  const { registerOpenRiskWorkspaceBridge } = useAppChromeActions();

  useEffect(() => {
    const pending = consumePendingWorkspaceActions();
    if (pending.sidebarPanel) {
      appActions.setSidebarPanel(pending.sidebarPanel);
    }
    if (pending.chartSymbol) {
      loadSymbolIntoActiveChart({
        symbol: pending.chartSymbol,
        name: pending.chartSymbol,
        exchange: "",
      });
    }
  }, [appActions, loadSymbolIntoActiveChart]);

  useEffect(() => {
    registerOpenRiskWorkspaceBridge({
      openAccountPanel: () => {
        appActions.setSidebarPanel("account");
      },
      loadSymbolIntoActiveChart: (symbol: string) => {
        loadSymbolIntoActiveChart({
          symbol,
          name: symbol,
          exchange: "",
        });
      },
    });
    return () => registerOpenRiskWorkspaceBridge(null);
  }, [appActions, loadSymbolIntoActiveChart, registerOpenRiskWorkspaceBridge]);

  return null;
}

export function useOpenRiskNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const appActions = useAppActions();
  const chartActions = useChartActions();
  const { openAccountPanel, loadSymbolIntoActiveChart } = useAppChromeActions();

  const navigateToWorkspaceIfNeeded = () => {
    if (pathname !== "/workspace") {
      router.push("/workspace");
    }
  };

  const handleOpenAccount = () => {
    if (appActions) {
      appActions.setSidebarPanel("account");
      return;
    }
    if (pathname === "/workspace") {
      openAccountPanel();
      return;
    }
    queuePendingSidebarPanel("account");
    navigateToWorkspaceIfNeeded();
  };

  const handleLoadSymbol = (symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;

    if (chartActions) {
      chartActions.loadSymbolIntoActiveChart({
        symbol: normalized,
        name: normalized,
        exchange: "",
      });
      return;
    }
    if (pathname === "/workspace") {
      loadSymbolIntoActiveChart(normalized);
      return;
    }
    queuePendingChartSymbol(normalized);
    navigateToWorkspaceIfNeeded();
  };

  return { handleOpenAccount, handleLoadSymbol };
}
