"use client";

import { useCallback, useRef, useState } from "react";
import EdgeSlideOver from "../design-system/EdgeSlideOver";
import { EdgeUnderlineTabs } from "../design-system";
import {
  readAppSettingsTabPreference,
  writeAppSettingsTabPreference,
  type AppSettingsTabId,
} from "@/lib/app/appSettingsTabPreference";
import ConnectionsSettingsSection from "./ConnectionsSettingsSection";
import GeneralSettingsSection from "./GeneralSettingsSection";
import MarketDataSettingsSection from "./MarketDataSettingsSection";
import MonthlyCostsSettingsSection from "./MonthlyCostsSettingsSection";
import { RiskPoliciesSection } from "../risk/RiskPoliciesSection";
import { useSettingsMarketDataHealth } from "./useSettingsMarketDataHealth";
import type { TradingAccount } from "@/lib/trading/types";

const SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "connections", label: "Connections" },
  { id: "market-data", label: "Market data" },
  { id: "costs", label: "Costs" },
  { id: "risk-policies", label: "Risk policies" },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  accounts?: TradingAccount[];
  accountsLoading?: boolean;
  recoveringTws?: boolean;
  recoverMessage?: string | null;
  onRecoverTws?: () => void;
};

export default function AppSettingsShell({
  open,
  onClose,
  returnFocusRef,
  accounts = [],
  accountsLoading = false,
  recoveringTws = false,
  recoverMessage = null,
  onRecoverTws = () => {},
}: Props) {
  const localTriggerRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<AppSettingsTabId>(() => readAppSettingsTabPreference());

  const setTab = useCallback((next: AppSettingsTabId) => {
    setActiveTab(next);
    writeAppSettingsTabPreference(next);
  }, []);

  const { health, loading: healthLoading, error: healthError } = useSettingsMarketDataHealth(open);

  return (
    <EdgeSlideOver
      open={open}
      title="Application settings"
      subtitle="Global preferences for Edge"
      onClose={onClose}
      testId="app-settings-shell"
      returnFocusRef={returnFocusRef ?? localTriggerRef}
    >
      <div className="space-y-4 p-1">
        <div data-testid="app-settings-tablist">
          <EdgeUnderlineTabs
            segments={[...SETTINGS_TABS]}
            value={activeTab}
            onChange={(id) => setTab(id as AppSettingsTabId)}
          />
        </div>

        {activeTab === "general" ? (
          <div
            role="tabpanel"
            id="app-settings-panel-general"
            aria-labelledby="app-settings-tab-general"
            data-testid="app-settings-panel-general"
          >
            <GeneralSettingsSection />
          </div>
        ) : null}

        {activeTab === "connections" ? (
          <div
            role="tabpanel"
            id="app-settings-panel-connections"
            aria-labelledby="app-settings-tab-connections"
            data-testid="app-settings-panel-connections"
          >
            <ConnectionsSettingsSection
              enabled={open}
              health={health}
              healthLoading={healthLoading}
              healthError={healthError}
              accounts={accounts}
              accountsLoading={accountsLoading}
              recoveringTws={recoveringTws}
              recoverMessage={recoverMessage}
              onRecoverTws={onRecoverTws}
            />
          </div>
        ) : null}

        {activeTab === "market-data" ? (
          <div
            role="tabpanel"
            id="app-settings-panel-market-data"
            aria-labelledby="app-settings-tab-market-data"
            data-testid="app-settings-panel-market-data"
          >
            <MarketDataSettingsSection
              enabled={open}
              health={health}
              healthLoading={healthLoading}
              healthError={healthError}
            />
          </div>
        ) : null}

        {activeTab === "costs" ? (
          <div
            role="tabpanel"
            id="app-settings-panel-costs"
            aria-labelledby="app-settings-tab-costs"
            data-testid="app-settings-panel-costs"
          >
            <MonthlyCostsSettingsSection enabled={open} health={health} />
          </div>
        ) : null}

        {activeTab === "risk-policies" ? (
          <div
            role="tabpanel"
            id="app-settings-panel-risk-policies"
            aria-labelledby="app-settings-tab-risk-policies"
            data-testid="app-settings-panel-risk-policies"
          >
            <RiskPoliciesSection />
          </div>
        ) : null}
      </div>
    </EdgeSlideOver>
  );
}
