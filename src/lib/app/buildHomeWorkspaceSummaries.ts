import type { LayoutTemplateId } from "@/lib/chartConfig";
import {
  getActiveTab,
  getTabPrimarySymbol,
  type WorkspaceTab,
  type WorkspaceTabsState,
} from "./workspaceTabs";

export type HomeWorkspaceSummary = {
  id: string;
  title: string;
  symbol: string;
  layoutId: LayoutTemplateId;
  isActive: boolean;
  remoteUpdatedAt?: string;
};

export function buildHomeWorkspaceSummaries(
  state: WorkspaceTabsState,
  maxItems = 4,
): HomeWorkspaceSummary[] {
  const activeTab = getActiveTab(state);
  const summaries = state.tabs.map((tab) => tabToSummary(tab, tab.id === activeTab.id));
  return summaries.slice(0, maxItems);
}

export function buildActiveWorkspaceSummary(
  state: WorkspaceTabsState,
): HomeWorkspaceSummary {
  const activeTab = getActiveTab(state);
  return tabToSummary(activeTab, true);
}

function tabToSummary(tab: WorkspaceTab, isActive: boolean): HomeWorkspaceSummary {
  return {
    id: tab.id,
    title: tab.title,
    symbol: getTabPrimarySymbol(tab),
    layoutId: tab.layout.layoutId,
    isActive,
    remoteUpdatedAt: tab.remote?.updatedAt,
  };
}
