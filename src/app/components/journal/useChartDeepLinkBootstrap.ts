"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import {
  parseChartDeepLinkParams,
  type ChartDeepLinkParams,
} from "@/lib/journal/chartDeepLink";

export function useChartDeepLinkBootstrap(
  hydrated: boolean,
  onApply: (params: NonNullable<ChartDeepLinkParams>) => void,
): void {
  const searchParams = useSearchParams();
  const deepLink = useMemo(
    () => parseChartDeepLinkParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (!hydrated || !deepLink) return;
    onApply(deepLink);
  }, [hydrated, deepLink, onApply]);
}
