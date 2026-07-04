"use client";

import { ScreenerPanelContent } from "./ScreenerPanelContent";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ScreenerDialog({ open, onClose }: Props) {
  return <ScreenerPanelContent active={open} variant="modal" onClose={onClose} />;
}
