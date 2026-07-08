"use client";

import { EdgeEmptyState } from "@/app/components/design-system";
import JournalModuleHeader from "@/app/components/journal/JournalModuleHeader";

export default function JournalSettingsView() {
  return (
    <>
      <JournalModuleHeader title="Settings" showActions={false} />
      <main className="min-h-0 flex-1 overflow-y-auto p-4" data-testid="journal-settings-view">
        <EdgeEmptyState message="Settings coming soon." />
      </main>
    </>
  );
}
