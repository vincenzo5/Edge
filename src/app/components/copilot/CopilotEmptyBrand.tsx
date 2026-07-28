"use client";

import Image from "next/image";
import type { CopilotShellVariant } from "./CopilotShell";

type Props = {
  variant: CopilotShellVariant;
};

export function CopilotEmptyBrand({ variant }: Props) {
  if (variant === "sidebar") {
    return (
      <div
        data-testid="copilot-empty-brand"
        data-brand-variant="mark"
        className="mb-[var(--edge-space-4)] flex items-center justify-center"
      >
        <Image
          src="/brand/icon-mono-white.svg"
          alt="Edge"
          width={40}
          height={40}
          priority
          className="opacity-90"
        />
      </div>
    );
  }

  return (
    <div
      data-testid="copilot-empty-brand"
      data-brand-variant="full"
      className="mb-[var(--copilot-bar-min-height)] flex items-center justify-center"
    >
      <Image
        src="/brand/logo-full-mono-white.svg"
        alt="Edge"
        width={120}
        height={48}
        priority
        className="h-[calc(var(--copilot-bar-min-height)*0.55)] w-auto opacity-90"
      />
    </div>
  );
}
