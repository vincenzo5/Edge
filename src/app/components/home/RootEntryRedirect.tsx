"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LAST_MODULE_STORAGE_KEY,
  shouldRedirectFromRoot,
} from "@/lib/app/lastModule";
import { EdgeSpinner } from "../design-system";

export default function RootEntryRedirect() {
  const router = useRouter();

  useEffect(() => {
    const target = shouldRedirectFromRoot(
      window.localStorage.getItem(LAST_MODULE_STORAGE_KEY),
    );
    router.replace(target);
  }, [router]);

  return (
    <div
      data-testid="root-entry-redirect"
      className="flex h-screen items-center justify-center bg-[var(--edge-background)]"
      role="status"
      aria-live="polite"
      aria-label="Loading Edge"
    >
      <EdgeSpinner size="md" />
    </div>
  );
}
