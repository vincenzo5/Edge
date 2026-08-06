"use client";

import type { MediaChatBlock } from "@/lib/copilot/chatBlocks";
import { EdgeButton } from "../design-system";

export type CopilotMediaBlockProps = {
  block: MediaChatBlock;
  testId?: string;
  pinned?: boolean;
  onPin?: () => void;
  onOpen?: (href: string) => void;
  disabled?: boolean;
};

export function CopilotMediaBlock({
  block,
  testId,
  pinned = false,
  onPin,
  onOpen,
  disabled = false,
}: CopilotMediaBlockProps) {
  const openHref = block.openHref ?? block.src ?? null;
  const showOpen = openHref != null && onOpen != null;

  return (
    <div
      data-testid={testId ?? "copilot-media-block"}
      className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-3 py-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {block.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.src}
              alt={block.caption ?? "Attached image"}
              className="mb-2 max-h-48 w-full max-w-sm rounded-lg border border-[var(--edge-border)] object-cover"
            />
          ) : null}
          {block.caption ? (
            <p className="text-sm font-medium text-[var(--edge-text-primary)]">{block.caption}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {showOpen ? (
            <EdgeButton
              type="button"
              variant="secondary"
              data-testid="copilot-media-open"
              disabled={disabled}
              onClick={() => onOpen(openHref!)}
            >
              {block.openLabel ?? "Open"}
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
