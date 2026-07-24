"use client";

import Link from "next/link";

import { EdgeButton, EdgeEmptyState } from "../design-system";

type Props = {
  onImportEvidence: () => void;
  evidenceCount?: number;
};

export default function BoardEmptyState({ onImportEvidence, evidenceCount = 0 }: Props) {
  return (
    <EdgeEmptyState
      title="Research board"
      message="Arrange evidence cards on a spatial board. Pin artifacts in Talk, send them here, then link ideas together."
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/copilot">
            <EdgeButton variant="primary">Open Talk</EdgeButton>
          </Link>
          {evidenceCount > 0 ? (
            <EdgeButton
              type="button"
              variant="secondary"
              data-testid="research-board-import-evidence"
              onClick={onImportEvidence}
            >
              Import from evidence ({evidenceCount})
            </EdgeButton>
          ) : null}
          <Link href="/workspace">
            <EdgeButton variant="secondary">Open Desk</EdgeButton>
          </Link>
        </div>
      }
      data-testid="research-board-empty"
    />
  );
}
