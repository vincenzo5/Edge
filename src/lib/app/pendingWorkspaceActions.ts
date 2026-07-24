import type { SidebarPanelId } from "@/lib/chartConfig";

const SIDEBAR_PANEL_KEY = "edge:pending-sidebar-panel";
const CHART_SYMBOL_KEY = "edge:pending-chart-symbol";

export type PendingWorkspaceActions = {
  sidebarPanel: SidebarPanelId | null;
  chartSymbol: string | null;
};

export function queuePendingSidebarPanel(panel: SidebarPanelId): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SIDEBAR_PANEL_KEY, panel);
  } catch {
    // ignore quota / private mode
  }
}

export function queuePendingChartSymbol(symbol: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(CHART_SYMBOL_KEY, symbol.trim().toUpperCase());
  } catch {
    // ignore quota / private mode
  }
}

export function consumePendingWorkspaceActions(): PendingWorkspaceActions {
  if (typeof sessionStorage === "undefined") {
    return { sidebarPanel: null, chartSymbol: null };
  }
  try {
    const sidebarPanel = sessionStorage.getItem(SIDEBAR_PANEL_KEY) as SidebarPanelId | null;
    const chartSymbol = sessionStorage.getItem(CHART_SYMBOL_KEY);
    sessionStorage.removeItem(SIDEBAR_PANEL_KEY);
    sessionStorage.removeItem(CHART_SYMBOL_KEY);
    return {
      sidebarPanel: sidebarPanel ?? null,
      chartSymbol: chartSymbol?.trim() ? chartSymbol.trim().toUpperCase() : null,
    };
  } catch {
    return { sidebarPanel: null, chartSymbol: null };
  }
}
