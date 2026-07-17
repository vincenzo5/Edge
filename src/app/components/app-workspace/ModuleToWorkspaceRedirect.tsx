"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  buildWorkspaceDeepLink,
  type WorkspaceDeepLinkParams,
} from "@/lib/appWorkspace/deepLinks";

type Props = Pick<WorkspaceDeepLinkParams, "surface" | "journalView">;

export default function ModuleToWorkspaceRedirect({ surface, journalView }: Props) {
  const router = useRouter();

  useEffect(() => {
    router.replace(buildWorkspaceDeepLink({ surface, journalView }));
  }, [journalView, router, surface]);

  return null;
}
