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
          src="/brand/favicon.svg"
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
      className="mb-[var(--copilot-bar-min-height)] flex w-full items-center justify-center"
    >
      <Image
        src="/brand/logo-full-mono-white.svg"
        alt="Edge"
        width={148}
        height={124}
        priority
        className="h-auto w-[min(32%,calc(var(--copilot-bar-max-width)*0.32))] opacity-90"
      />
    </div>
  );
}
