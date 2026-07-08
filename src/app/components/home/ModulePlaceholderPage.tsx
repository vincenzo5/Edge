"use client";

import Link from "next/link";
import { EdgeButton, EdgeEmptyState } from "../design-system";
import AppModuleShell from "./AppModuleShell";
import ModuleRouteTracker from "./ModuleRouteTracker";

type Props = {
  module: "journal" | "research";
  title: string;
  description: string;
};

export default function ModulePlaceholderPage({ module, title, description }: Props) {
  return (
    <AppModuleShell testId={`${module}-placeholder-page`}>
      <ModuleRouteTracker module={module} />
      <header className="flex h-12 shrink-0 items-center border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-4">
        <h1 className="text-sm font-semibold text-[var(--edge-text-strong)]">{title}</h1>
      </header>
      <main className="flex min-h-0 flex-1 items-center justify-center">
        <EdgeEmptyState
          message={description}
          action={
            <Link href="/chart">
              <EdgeButton variant="primary">Open charts</EdgeButton>
            </Link>
          }
        />
      </main>
    </AppModuleShell>
  );
}
