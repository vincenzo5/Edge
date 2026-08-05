import { Suspense } from "react";

import JournalCaptureStudio from "@/app/components/journal/JournalCaptureStudio";

export default function JournalCapturePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[var(--edge-background)] text-sm text-[var(--edge-text-secondary)]">
          Loading capture studio…
        </div>
      }
    >
      <JournalCaptureStudio />
    </Suspense>
  );
}
