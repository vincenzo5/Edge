"use client";

import { useState } from "react";
import { defaultFloatingGeometry } from "@/lib/sidebar/floatingPanelGeometry";
import { OptionsFloatingPanel } from "../sidebar/panels/OptionsFloatingPanel";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OptionsChainDialog({ open, onClose }: Props) {
  const [geometry, setGeometry] = useState(() => defaultFloatingGeometry("options"));

  if (!open) return null;

  return (
    <OptionsFloatingPanel
      geometry={geometry}
      onGeometryChange={setGeometry}
      onClose={onClose}
    />
  );
}
