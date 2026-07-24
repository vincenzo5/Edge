"use client";

import { useRef } from "react";
import type { Theme } from "@/lib/chartConfig";
import Tooltip from "../Tooltip";
import { compactControlClass } from "../design-system/styles";
import DataHealthMenu from "./DataHealthMenu";
import HealthSeverityDot, { severityRingClass } from "./HealthSeverityDot";
import { useDataHealth } from "./DataHealthProvider";

type Props = {
  theme: Theme;
  /** @deprecated Session label removed from chart chrome; kept for call-site compatibility */
  marketSessionLabel?: string | null;
  /** @deprecated No longer renders session label */
  showMarketStatus?: boolean;
};

export default function DataHealthButton({
  theme,
}: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { snapshot, menuOpen, setMenuOpen } = useDataHealth();
  const projection = snapshot.projection;

  return (
    <>
      <Tooltip content={projection.tooltip} theme={theme} side="left" portaled>
        <button
          ref={anchorRef}
          type="button"
          title={projection.accessibleLabel}
          aria-label={projection.accessibleLabel}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-testid="chart-data-source-badge"
          onClick={() => setMenuOpen(!menuOpen)}
          className={`edge-focus-ring ${compactControlClass()} inline-flex w-[var(--edge-control-height-compact)] items-center justify-center overflow-hidden rounded bg-[var(--edge-surface-panel)] ring-1 transition-colors hover:bg-[var(--edge-surface-hover)] ${severityRingClass(projection.severity)} ${menuOpen ? "bg-[var(--edge-surface-hover)]" : ""}`}
        >
          <span className="flex items-center justify-center">
            <HealthSeverityDot severity={projection.severity} size="md" />
          </span>
        </button>
      </Tooltip>
      <DataHealthMenu theme={theme} anchorRef={anchorRef} />
    </>
  );
}
