"use client";

import { useRouter } from "next/navigation";

import { buildWorkspaceDeepLink } from "@/lib/appWorkspace/deepLinks";
import type { ResearchCardSketch } from "@/lib/research/sessionSketch";

type JournalDraftResearchCardSketch = Extract<ResearchCardSketch, { type: "journalDraft" }>;

import { EdgeButton } from "../design-system";

type Props = {
  card: JournalDraftResearchCardSketch;
};

export default function BoardJournalDraftCardHost({ card }: Props) {
  const router = useRouter();
  const summary = card.summary ?? "Journal draft";

  const openJournal = () => {
    router.push(buildWorkspaceDeepLink({ surface: "journal", journalView: "trades" }));
  };

  const saveDraft = () => {
    router.push(buildWorkspaceDeepLink({ surface: "journal", journalView: "open" }));
  };

  return (
    <div className="flex flex-col gap-2" data-testid={`board-journal-host-${card.id}`}>
      <p className="text-xs text-[var(--edge-text-secondary)]">{summary}</p>
      <div className="flex flex-wrap gap-1" data-board-card-action>
        <EdgeButton
          type="button"
          variant="secondary"
          data-testid={`board-journal-open-${card.id}`}
          onClick={openJournal}
        >
          Open
        </EdgeButton>
        <EdgeButton
          type="button"
          variant="link"
          data-testid={`board-journal-save-${card.id}`}
          onClick={saveDraft}
        >
          Save
        </EdgeButton>
      </div>
    </div>
  );
}
