"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/journal/dashboard", label: "Dashboard", testId: "journal-subnav-dashboard" },
  { href: "/journal/trades", label: "Trades", testId: "journal-subnav-trades" },
  { href: "/journal/settings", label: "Settings", testId: "journal-subnav-settings" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href === "/journal/dashboard" && pathname === "/journal");
}

export default function JournalSubNav() {
  const pathname = usePathname();

  return (
    <nav
      data-testid="journal-subnav"
      aria-label="Journal sections"
      className="flex w-36 shrink-0 flex-col gap-0.5 border-r border-[var(--edge-border)] bg-[var(--edge-surface-rail)] px-2 py-3"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={item.testId}
            aria-current={active ? "page" : undefined}
            className={`rounded-[var(--edge-radius-sm)] px-2.5 py-2 text-xs font-medium transition-colors ${
              active
                ? "bg-[var(--edge-surface-hover)] text-[var(--edge-text-strong)]"
                : "text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
