"use client";

import Link from "next/link";
import { EdgeButton, EdgeEmptyState } from "../design-system";
import ModuleRouteTracker from "./ModuleRouteTracker";

type Props = {
  module: "journal" | "research";
  title: string;
  description: string;
};

export default function ModulePlaceholderPage({ module, title, description }: Props) {
  return (
    <>
      <ModuleRouteTracker module={module} />
      <div
        data-testid={`${module}-placeholder-page`}
        className="flex min-h-screen flex-col bg-[var(--edge-background)]"
      >
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-4">
          <Link
            href="/home"
            className="text-sm text-[var(--edge-accent-blue)] hover:underline"
          >
            Home
          </Link>
          <span className="text-sm text-[var(--edge-text-muted)]">/</span>
          <h1 className="text-sm font-semibold text-[var(--edge-text-strong)]">{title}</h1>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <EdgeEmptyState
            message={description}
            action={
              <Link href="/chart">
                <EdgeButton variant="primary">Open charts</EdgeButton>
              </Link>
            }
          />
        </main>
      </div>
    </>
  );
}
