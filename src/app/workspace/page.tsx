"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AppWorkspaceShell from "@/app/components/app-workspace/AppWorkspaceShell";
import { useAppWorkspace } from "@/app/components/app-workspace/AppWorkspaceContext";
import { resolveAlertPrefillFromSearchParams } from "@/lib/alerts/openAlertPrefill";
import {
  clearWorkspaceIngressLock,
  readWorkspaceIngressLock,
  workspacePathAfterIngress,
  writeWorkspaceIngressLock,
} from "@/lib/appWorkspace/deepLinks";
import type { SurfaceId, TileSurfaceState } from "@/lib/appWorkspace/types";

const WORKSPACE_SURFACES: SurfaceId[] = [
  "chart",
  "screener",
  "journal",
  "scripts",
  "alerts",
  "copilot",
];

export function buildIngressSurfaceState(
  screenerView: string | null,
  journalView: string | null,
  scriptId: string | null = null,
  alertId: string | null = null,
  searchParams: URLSearchParams = new URLSearchParams(),
): TileSurfaceState | undefined {
  const state: TileSurfaceState = {};

  if (
    screenerView === "review" ||
    screenerView === "screens" ||
    screenerView === "results" ||
    screenerView === "keepers"
  ) {
    state.screenerView = "screens";
  }

  if (
    journalView === "dashboard" ||
    journalView === "trades" ||
    journalView === "open" ||
    journalView === "settings"
  ) {
    state.journalView = journalView;
  }

  if (scriptId) {
    state.selectedScriptId = scriptId;
  }

  if (alertId) {
    state.selectedAlertId = alertId;
  }

  const alertPrefill = resolveAlertPrefillFromSearchParams(searchParams);
  if (alertPrefill) {
    state.alertPrefill = alertPrefill;
  }

  return Object.keys(state).length > 0 ? state : undefined;
}

function WorkspaceDeepLinkHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleSurfaceIngress, hydrated } = useAppWorkspace();
  const lastIngressRef = useRef<string | null>(null);
  const searchKey = searchParams.toString();

  useEffect(() => {
    if (!hydrated) return;

    const surface = searchParams.get("surface") as SurfaceId | null;
    if (!surface || !WORKSPACE_SURFACES.includes(surface)) {
      lastIngressRef.current = null;
      clearWorkspaceIngressLock();
      return;
    }

    const cleaned = workspacePathAfterIngress(searchParams);
    const currentPath = `/workspace${searchKey ? `?${searchKey}` : ""}`;

    // Sticky query after a prior consume in this tab — strip URL, do not reopen.
    if (readWorkspaceIngressLock() === searchKey) {
      if (cleaned !== currentPath) {
        router.replace(cleaned, { scroll: false });
      }
      return;
    }

    if (lastIngressRef.current === searchKey) return;
    lastIngressRef.current = searchKey;

    const surfaceState = buildIngressSurfaceState(
      searchParams.get("screenerView"),
      searchParams.get("journalView"),
      searchParams.get("scriptId"),
      searchParams.get("alertId"),
      searchParams,
    );

    handleSurfaceIngress(surface, {
      region: "right",
      ...(surfaceState ? { surfaceState } : {}),
    });

    writeWorkspaceIngressLock(searchKey);
    if (cleaned !== currentPath) {
      router.replace(cleaned, { scroll: false });
    }
  }, [handleSurfaceIngress, hydrated, router, searchKey, searchParams]);

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
