"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { annotationTextClass } from "../design-system/styles";
import TwsRecoverButton from "../data-health/TwsRecoverButton";
import { useDataHealth } from "../data-health/DataHealthProvider";
import { subscribeTwsRecovery } from "@/lib/marketData/twsRecoveryBus";

const HEADER_CONNECTION_SLOT_ID = "app-header-connection-slot";

/** Renders projection-driven broker incident into the app header portal slot. */
export default function AppHeaderConnectionIncident({
  onRecoveryCompleted,
}: {
  onRecoveryCompleted?: () => void;
}) {
  const { snapshot, recoveringTws, recoverMessage, recoverTws } = useDataHealth();
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  const { chromeIncidentLabel, chromeRecoveryLabel, showRecovery } = snapshot.projection;

  useEffect(() => {
    setSlot(document.getElementById(HEADER_CONNECTION_SLOT_ID));
  }, []);

  useEffect(() => {
    if (!onRecoveryCompleted) return;
    return subscribeTwsRecovery((event) => {
      if (event.phase === "completed") {
        onRecoveryCompleted();
      }
    });
  }, [onRecoveryCompleted]);

  if (!slot || chromeIncidentLabel === null) {
    return null;
  }

  return createPortal(
    <div className="flex items-center gap-2" role="status">
      <span
        className={`${annotationTextClass()} text-[var(--edge-text-secondary)]`}
        data-testid="app-header-connection-incident"
      >
        {chromeIncidentLabel}
      </span>
      {showRecovery && chromeRecoveryLabel ? (
        <TwsRecoverButton
          compact
          testId="app-header-recover-tws"
          label={chromeRecoveryLabel}
          recovering={recoveringTws}
          onClick={() => {
            void recoverTws();
          }}
        />
      ) : null}
      {recoverMessage ? (
        <span
          className={`max-w-[12rem] ${annotationTextClass()}`}
          data-testid="app-header-recover-message"
        >
          {recoverMessage}
        </span>
      ) : null}
    </div>,
    slot,
  );
}

export { HEADER_CONNECTION_SLOT_ID };
