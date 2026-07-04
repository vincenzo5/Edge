"use client";

import { OptionsChainView } from "../../options/OptionsChainView";
import {
  OptionsRiskCalculator,
} from "../../options/OptionsRiskCalculator";
import { useOptionsWorkspaceModel } from "../../options/useOptionsWorkspaceModel";
import { useRiskSettings } from "../../RiskSettingsProvider";
import EdgeSegmentedTabs from "../../design-system/EdgeSegmentedTabs";
import { PanelPopOutButton } from "../PanelChromeActions";

export function OptionsSidebarPanel() {
  const workspace = useOptionsWorkspaceModel();
  const { dollarRisk, basisStale } = useRiskSettings();
  const { session, setMode, patchCalculator, setLegs, seedFromAnalyze, clearSeed } = workspace;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--edge-border)] px-3 py-2">
        <EdgeSegmentedTabs
          segments={[
            { id: "chain", label: "Chain" },
            { id: "calculator", label: "Risk Calculator" },
          ]}
          value={session.mode}
          onChange={(value) => setMode(value as "chain" | "calculator")}
        />
        <PanelPopOutButton label="Pop out" />
      </div>
      {session.mode === "chain" ? (
        <OptionsChainView
          model={workspace}
          variant="sidebar"
          onAnalyzeContract={(contract) => seedFromAnalyze(contract, "buy", 1)}
        />
      ) : (
        <OptionsRiskCalculator
          model={workspace}
          calculator={session.calculator}
          patchCalculator={patchCalculator}
          setLegs={setLegs}
          dollarRisk={dollarRisk}
          basisStale={basisStale}
          seedLeg={session.pendingSeedLeg}
          onSeedConsumed={clearSeed}
          onDone={() => setMode("chain")}
        />
      )}
    </div>
  );
}

/** @deprecated Use OptionsSidebarPanel */
export { OptionsSidebarPanel as OptionsPanel };
