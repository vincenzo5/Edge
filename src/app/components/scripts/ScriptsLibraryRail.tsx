"use client";

import { useMemo, useState } from "react";

import { CopyIcon } from "@/app/components/chart-chrome/ChartHeaderIcons";
import { EdgeButton, EdgeSearchInput } from "@/app/components/design-system";
import { useScriptLibraryOptional } from "@/lib/scriptLibrary/ScriptLibraryContext";
import { isSupportedScriptVersion } from "@/lib/scriptLibrary";
import type { ScriptLibraryEntry } from "@/lib/scriptLibrary/types";

type Props = {
  selectedScriptId: string | null;
  onSelectScript: (scriptId: string) => void;
  onCreateScript: () => void;
  /** When true, rail sits above the editor and must not consume the full tile height. */
  stacked?: boolean;
};

const ACTION_ICON_SIZE = 16;

/** 16×16 trash glyph matched to CopyIcon visual weight (chart TrashIcon is 28-viewBox). */
function TrashIcon({ size = ACTION_ICON_SIZE }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 4.5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M6 4.5V3.5a1 1 0 011-1h2a1 1 0 011 1v1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 4.5l.6 8.5h4.8L11 4.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 7v4M9 7v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const actionIconButtonClass =
  "edge-focus-ring inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]";

function scriptStatusLabel(script: ScriptLibraryEntry): string {
  const head = script.headRevision
    ? script.revisions.find((rev) => rev.revision === script.headRevision)
    : undefined;
  if (!head) return script.draft?.dirty ? "Draft" : "Empty";
  if (!isSupportedScriptVersion(head.languageVersion, head.sdkVersion)) return "Unsupported";
  return "Saved";
}

export default function ScriptsLibraryRail({
  selectedScriptId,
  onSelectScript,
  onCreateScript,
  stacked = false,
}: Props) {
  const library = useScriptLibraryOptional();
  const [query, setQuery] = useState("");

  const scripts = useMemo(() => {
    const all = library?.scripts ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((script) => script.displayName.toLowerCase().includes(q));
  }, [library?.scripts, query]);

  const handleDelete = (script: ScriptLibraryEntry) => {
    if (!library) return;
    const message = `Delete "${script.displayName}"?`;
    if (!window.confirm(message)) return;
    void library.deleteScript(script.scriptId).then(() => {
      if (selectedScriptId === script.scriptId) {
        onSelectScript("");
      }
    });
  };

  const handleDuplicate = (scriptId: string) => {
    if (!library) return;
    void library.duplicateScript(scriptId).then((copy) => {
      if (copy) onSelectScript(copy.scriptId);
    });
  };

  return (
    <aside
      className={
        stacked
          ? "flex max-h-44 min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)]"
          : "flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] sm:w-56 sm:border-r self-stretch"
      }
      data-testid="scripts-library-rail"
    >
      <div className="shrink-0 border-b border-[var(--edge-border-subtle)] p-2">
        <EdgeSearchInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search scripts"
          aria-label="Search scripts"
          data-testid="scripts-library-search"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {library?.error ? (
          <p className="mb-2 text-xs text-[var(--edge-negative)]">{library.error}</p>
        ) : null}
        {scripts.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-[var(--edge-text-secondary)]">
            No saved scripts yet
          </p>
        ) : (
          <ul className="space-y-1">
            {scripts.map((script) => {
              const selected = script.scriptId === selectedScriptId;
              return (
                <li key={script.scriptId}>
                  <div
                    className={`flex items-center gap-0.5 rounded px-1 py-1 transition-colors ${
                      selected
                        ? "bg-[var(--edge-surface-hover)] text-[var(--edge-text-primary)]"
                        : "text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]"
                    }`}
                  >
                    <button
                      type="button"
                      data-testid={`scripts-library-item-${script.scriptId}`}
                      className="edge-focus-ring min-w-0 flex-1 rounded px-1 py-1 text-left"
                      onClick={() => onSelectScript(script.scriptId)}
                    >
                      <span className="block truncate text-sm font-medium">
                        {script.displayName}
                      </span>
                      <span className="block truncate text-xs text-[var(--edge-text-muted)]">
                        {scriptStatusLabel(script)}
                      </span>
                    </button>
                    {selected ? (
                      <div className="-mr-0.5 flex shrink-0 items-center gap-0">
                        <button
                          type="button"
                          title="Duplicate"
                          aria-label={`Duplicate ${script.displayName}`}
                          data-testid={`scripts-library-duplicate-${script.scriptId}`}
                          className={actionIconButtonClass}
                          onClick={() => handleDuplicate(script.scriptId)}
                        >
                          <CopyIcon size={ACTION_ICON_SIZE} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          aria-label={`Delete ${script.displayName}`}
                          data-testid={`scripts-library-delete-${script.scriptId}`}
                          className={`${actionIconButtonClass} hover:text-[var(--edge-negative)]`}
                          onClick={() => handleDelete(script)}
                        >
                          <TrashIcon size={ACTION_ICON_SIZE} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--edge-border-subtle)] p-2">
        <EdgeButton
          type="button"
          className="w-full justify-center"
          onClick={onCreateScript}
          data-testid="scripts-library-new"
        >
          New script
        </EdgeButton>
      </div>
    </aside>
  );
}
