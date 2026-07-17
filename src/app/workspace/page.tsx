"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import AppWorkspaceShell from "@/app/components/app-workspace/AppWorkspaceShell";
import { useAppWorkspace } from "@/app/components/app-workspace/AppWorkspaceContext";
import type { SurfaceId, TileSurfaceState } from "@/lib/appWorkspace/types";

export function buildIngressSurfaceState(
  _screenerView: string | null,
  journalView: string | null,
): TileSurfaceState | undefined {
  const state: TileSurfaceState = {};

  if (
    journalView === "dashboard" ||
    journalView === "trades" ||
    journalView === "settings"
  ) {
    state.journalView = journalView;
  }

  return Object.keys(state).length > 0 ? state : undefined;
}

function WorkspaceDeepLinkHandler() {
  const searchParams = useSearchParams();
  const { handleSurfaceIngress, hydrated } = useAppWorkspace();
  const lastIngressRef = useRef<string | null>(null);
  const searchKey = searchParams.toString();

  useEffect(() => {
    if (!hydrated) return;

    const surface = searchParams.get("surface") as SurfaceId | null;
    if (!surface || (surface !== "chart" && surface !== "screener" && surface !== "journal")) {
      lastIngressRef.current = null;
      return;
    }

    if (lastIngressRef.current === searchKey) return;
    lastIngressRef.current = searchKey;

    const surfaceState = buildIngressSurfaceState(
      searchParams.get("screenerView"),
      searchParams.get("journalView"),
    );

    handleSurfaceIngress(surface, {
      region: "right",
      ...(surfaceState ? { surfaceState } : {}),
    });
  }, [handleSurfaceIngress, hydrated, searchKey]);

  return null;
}

export default function WorkspacePage() {
  return (
    <AppWorkspaceShell>
      <Suspense fallback={null}>
        <WorkspaceDeepLinkHandler />
      </Suspense>
    </AppWorkspaceShell>
  );
}
