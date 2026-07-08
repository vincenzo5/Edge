"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMarketResearchNotes } from "@/lib/persistence/client/marketResearchNotesClient";
import type { MarketResearchNoteResponse } from "@/lib/persistence/schemas/marketResearchNote";
import { EdgeEmptyState, EdgePanelHeader, EdgeSpinner } from "../design-system";

const MAX_NOTES = 5;

function noteTitle(note: MarketResearchNoteResponse): string {
  return note.researchThesis.title?.trim() || `${note.symbol} ${note.researchNoteType}`;
}

export default function HomeResearchPanel() {
  const [notes, setNotes] = useState<MarketResearchNoteResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchMarketResearchNotes().then((result) => {
      if (cancelled) return;
      setNotes(result.slice(0, MAX_NOTES));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      data-testid="home-research-panel"
      className="flex h-full min-h-0 flex-col rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)]"
    >
      <EdgePanelHeader
        title="Research"
        actions={
          <Link
            href="/research"
            data-testid="home-research-open"
            className="text-xs text-[var(--edge-accent-blue)] hover:underline"
          >
            Open
          </Link>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <EdgeSpinner size="sm" />
          </div>
        ) : notes.length === 0 ? (
          <EdgeEmptyState message="No research notes yet." />
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] px-3 py-2"
              >
                <p className="text-sm font-medium text-[var(--edge-text-strong)]">{noteTitle(note)}</p>
                <p className="mt-0.5 text-xs text-[var(--edge-text-muted)]">
                  {note.symbol} · {note.researchNoteType}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
