"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  buildWorkspaceDeepLink,
  type WorkspaceDeepLinkParams,
} from "@/lib/appWorkspace/deepLinks";
import { appendChartDeepLinkSearchParams } from "@/lib/journal/chartDeepLink";

type Props = Pick<WorkspaceDeepLinkParams, "surface" | "journalView" | "screenerView">;

export default function ModuleToWorkspaceRedirect({
  surface,
  journalView,
  screenerView,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const href = buildWorkspaceDeepLink({ surface, journalView, screenerView });
    if (surface !== "chart") {
      router.replace(href);
      return;
    }
    const url = new URL(href, "http://local");
    appendChartDeepLinkSearchParams(url.searchParams, searchParams);
    const qs = url.searchParams.toString();
    router.replace(qs ? `${url.pathname}?${qs}` : url.pathname);
  }, [journalView, router, screenerView, searchParams, surface]);

  return null;
}
