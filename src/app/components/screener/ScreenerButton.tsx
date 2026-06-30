"use client";

import ChartHeaderButton from "../chart-chrome/ChartHeaderButton";
import { ScreenerIcon } from "../chart-chrome/ChartHeaderIcons";
import type { Theme } from "@/lib/chartConfig";

type Props = {
  theme: Theme;
  onOpen: () => void;
};

export default function ScreenerButton({ theme, onOpen }: Props) {
  return (
    <ChartHeaderButton
      theme={theme}
      title="Stock screener"
      onClick={onOpen}
      aria-haspopup="dialog"
      data-testid="screener-trigger"
    >
      <ScreenerIcon />
    </ChartHeaderButton>
  );
}
