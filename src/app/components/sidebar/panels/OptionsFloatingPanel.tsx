"use client";

import { OptionsChainView } from "../../options/OptionsChainView";
import {
  OptionsRiskCalculator,
} from "../../options/OptionsRiskCalculator";
import { useOptionsWorkspaceModel } from "../../options/useOptionsWorkspaceModel";
import { useRiskSettings } from "../../RiskSettingsProvider";
import EdgeSegmentedTabs from "../../design-system/EdgeSegmentedTabs";
import FloatingPanelShell from "../FloatingPanelShell";
import type { FloatingPanelGeometry } from "@/lib/chartConfig";

type Props = {
  geometry: FloatingPanelGeometry;
  onGeometryChange: (geometry: FloatingPanelGeometry) => void;
  onClose: () => void;
  onDock?: () => void;
};

export function OptionsFloatingPanel({
  geometry,
  onGeometryChange,
  onClose,
  onDock,
}: Props) {
  const workspace = useOptionsWorkspaceModel();
  const { dollarRisk, basisStale } = useRiskSettings();
  const { session, setMode, patchCalculator, setLegs, seedFromAnalyze, clearSeed } = workspace;
  const symbol = workspace.symbol ?? "Options";

  return (
    <FloatingPanelShell
      panelId="options"
      title={`${symbol} — Options Chain`}
      geometry={geometry}
      onGeometryChange={onGeometryChange}
      onDock={onDock}
      onClose={onClose}
      testId="options-chain-dialog"
      headerActions={
        <EdgeSegmentedTabs
          segments={[
            { id: "chain", label: "Chain" },
            { id: "calculator", label: "Risk Calculator" },
          ]}
          value={session.mode}
          onChange={(value) => setMode(value as "chain" | "calculator")}
        />
      }
    >
      {session.mode === "chain" ? (
        <OptionsChainView
          model={workspace}
          variant="dialog"
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
    </FloatingPanelShell>
  );
}
