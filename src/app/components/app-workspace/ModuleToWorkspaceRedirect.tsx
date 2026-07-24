"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  buildWorkspaceDeepLink,
  type WorkspaceDeepLinkParams,
} from "@/lib/appWorkspace/deepLinks";

type Props = Pick<WorkspaceDeepLinkParams, "surface" | "journalView" | "screenerView">;

export default function ModuleToWorkspaceRedirect({
  surface,
  journalView,
  screenerView,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    router.replace(buildWorkspaceDeepLink({ surface, journalView, screenerView }));
  }, [journalView, router, screenerView, surface]);

  return null;
}
