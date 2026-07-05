"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import type { AppModule } from "@/lib/app/lastModule";
import { recordLastModule } from "@/lib/app/lastModule";
import { HOME_LAYOUT_DIMENSIONS } from "@/lib/app/homeLayout";
import {
  iconRailButtonClass,
  iconRailIconClass,
  iconRailShellClass,
  toolbarButtonStateClass,
} from "../chart-icons/toolbarButtonStyles";

type NavItem = {
  module: AppModule;
  href: string;
  label: string;
  testId: string;
  Icon: ComponentType<{ className?: string }>;
};

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z" strokeLinejoin="round" />
    </svg>
  );
}

function ChartsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 19V5M4 19h16M8 15V9M12 19V7M16 13v-2" strokeLinecap="round" />
    </svg>
  );
}

function JournalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M6 4h12v16H6z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function ResearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M15 4v3h3M9 12h6M9 16h4" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { module: "home", href: "/home", label: "Home", testId: "home-nav-home", Icon: HomeIcon },
  { module: "chart", href: "/chart", label: "Charts", testId: "home-nav-chart", Icon: ChartsIcon },
  { module: "journal", href: "/journal", label: "Journal", testId: "home-nav-journal", Icon: JournalIcon },
  { module: "research", href: "/research", label: "Research", testId: "home-nav-research", Icon: ResearchIcon },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/home") return pathname === "/home";
  return pathname.startsWith(href);
}

export default function HomeAppNav() {
  const pathname = usePathname();

  return (
    <nav
      data-testid="home-app-nav"
      aria-label="App modules"
      style={{ width: HOME_LAYOUT_DIMENSIONS.navRailWidth }}
      className={`${iconRailShellClass(false, "left")} shrink-0 border-r border-[var(--edge-border)]`}
    >
      <div className="flex flex-col gap-0.5 px-0.5 py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.Icon;
          return (
            <Link
              key={item.module}
              href={item.href}
              data-testid={item.testId}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              onClick={() => recordLastModule(item.module)}
              className={`${iconRailButtonClass(false)} ${toolbarButtonStateClass(active)}`}
            >
              <Icon className={iconRailIconClass(false)} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
