"use client";

import type { DataChatBlock } from "@/lib/copilot/chatBlocks";
import type { ResearchArtifactHint } from "@/lib/research/artifactHint";
import { researchCardFromHint } from "@/lib/research/cardFromHint";
import { canOpenResearchCard, openResearchCardHref } from "@/lib/research/openResearchCard";
import { EdgeButton } from "../design-system";

export type CopilotDataBlockProps = {
  block: DataChatBlock;
  testId?: string;
  pinned?: boolean;
  onPin?: () => void;
  onOpen?: (href: string) => void;
  disabled?: boolean;
};

function dataBlockKindLabel(hint: ResearchArtifactHint | undefined): string {
  if (!hint) return "Data";
  switch (hint.type) {
    case "screener":
      return "Screener";
    case "journalDraft":
      return "Journal";
    default:
      return "Data";
  }
}

function resolveOpenHref(block: DataChatBlock): string | null {
  if (!block.pinHint) return null;
  const card = researchCardFromHint(block.pinHint, {
    threadId: "",
    messageId: "",
  });
  if (!canOpenResearchCard(card)) return null;
  return openResearchCardHref(card);
}

export function CopilotDataBlock({
  block,
  testId,
  pinned = false,
  onPin,
  onOpen,
  disabled = false,
}: CopilotDataBlockProps) {
  const openHref = resolveOpenHref(block);
  const showOpen = openHref != null && onOpen != null;

  return (
    <div
      data-testid={testId ?? "copilot-data-block"}
      data-block-shape={block.shape}
      className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-3 py-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-tertiary)]">
            {dataBlockKindLabel(block.pinHint)}
          </p>
          {block.title ? (
            <p className="truncate text-sm font-medium text-[var(--edge-text-primary)]">
              {block.title}
            </p>
          ) : null}
          {block.shape === "kv" && block.entries?.length ? (
            <dl className="mt-2 space-y-1 text-xs text-[var(--edge-text-secondary)]">
              {block.entries.map((entry) => (
                <div key={`${entry.key}-${entry.value}`} className="flex gap-2">
                  <dt className="shrink-0 font-medium text-[var(--edge-text-tertiary)]">
                    {entry.key}
                  </dt>
                  <dd className="min-w-0 [overflow-wrap:anywhere]">{entry.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {block.shape === "table" && block.columns?.length && block.rows?.length ? (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[12rem] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--edge-border)] text-[var(--edge-text-tertiary)]">
                    {block.columns.map((column) => (
                      <th key={column.id} className="px-2 py-1 font-medium">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr
                      key={`row-${rowIndex}`}
                      className="border-b border-[var(--edge-border)] last:border-b-0"
                    >
                      {block.columns!.map((column) => (
                        <td
                          key={`${rowIndex}-${column.id}`}
                          className="px-2 py-1 text-[var(--edge-text-secondary)]"
                        >
                          {row[column.id] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {showOpen ? (
            <EdgeButton
              type="button"
              variant="secondary"
              data-testid="copilot-data-open"
              disabled={disabled}
              onClick={() => onOpen(openHref!)}
            >
              Open
            </EdgeButton>
          ) : null}
          {onPin ? (
            <EdgeButton
              type="button"
              variant={pinned ? "secondary" : "primary"}
              data-testid={pinned ? "copilot-artifact-pinned" : "copilot-artifact-pin"}
              disabled={disabled || pinned}
              onClick={onPin}
            >
              {pinned ? "Pinned" : "Pin"}
            </EdgeButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
