"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { TileSurfaceState } from "@/lib/appWorkspace/types";

const NAV_ITEMS = [
  { href: "/screener/review", view: "review" as const, label: "Review", testId: "screener-subnav-review" },
  { href: "/screener/screens", view: "screens" as const, label: "Screens", testId: "screener-subnav-screens" },
  { href: "/screener/results", view: "results" as const, label: "Results", testId: "screener-subnav-results" },
  { href: "/screener/keepers", view: "keepers" as const, label: "Keepers", testId: "screener-subnav-keepers" },
] as const;

type TileView = NonNullable<TileSurfaceState["screenerView"]>;

type Props = {
  mode?: "route" | "tile";
  activeView?: TileView;
  onSelectView?: (view: TileView) => void;
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href === "/screener/review" && pathname === "/screener");
}

export default function ScreenerSubNav({ mode = "route", activeView, onSelectView }: Props) {
  const pathname = usePathname();

  return (
    <nav
      data-testid="screener-subnav"
      aria-label="Screener sections"
      className="flex w-36 shrink-0 flex-col gap-0.5 border-r border-[var(--edge-border)] bg-[var(--edge-surface-rail)] px-2 py-3"
    >
      {NAV_ITEMS.map((item) => {
        const active =
          mode === "tile" ? activeView === item.view : isActivePath(pathname, item.href);
        const className = `rounded-[var(--edge-radius-sm)] px-2.5 py-2 text-xs font-medium transition-colors ${
          active
            ? "bg-[var(--edge-surface-hover)] text-[var(--edge-text-strong)]"
            : "text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]"
        }`;

        if (mode === "tile" && onSelectView) {
          return (
            <button
              key={item.view}
              type="button"
              data-testid={item.testId}
              aria-current={active ? "page" : undefined}
              className={className}
              onClick={() => onSelectView(item.view)}
            >
              {item.label}
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={item.testId}
            aria-current={active ? "page" : undefined}
            className={className}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
