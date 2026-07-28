import type React from "react";

/**
 * Navigation content for the sidebar and its mobile drawer.
 *
 * Only `/` is implemented; the rest are placeholders, as they have been since
 * v1. They stay because the sidebar's job is to establish that this is an
 * application with sections — an app shell with a single link reads as a
 * prototype.
 */

export interface NavItem {
  label: string;
  href: string;
  icon: React.FC<{ className?: string }>;
}

export interface NavGroup {
  /** Undefined for the primary group, which needs no heading. */
  label?: string;
  items: NavItem[];
}

/* ── Icons ───────────────────────────────────────────────────────────────── */

function OverviewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <path
        d="M2 10.5 5.5 6.5 8 9l4.5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 13.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MarketsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <rect x="2" y="8" width="3" height="6" rx="0.75" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6.5" y="4.5" width="3" height="9.5" rx="0.75" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="2" width="3" height="12" rx="0.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PortfolioIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <rect x="2" y="4.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 4.5V3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <path
        d="M6 4 2.5 8 6 12M10 4l3.5 4-3.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <path
        d="M3.5 2.5h6L12.5 5.5v8h-9v-11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6 8h4M6 10.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StatusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v3.25l2 1.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Structure ───────────────────────────────────────────────────────────── */

export const BRAND = "CryptoBay";

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    items: [
      { label: "Overview", href: "/", icon: OverviewIcon },
      { label: "Markets", href: "/markets", icon: MarketsIcon },
      { label: "Portfolio", href: "/portfolio", icon: PortfolioIcon },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "API", href: "/platform/api", icon: CodeIcon },
      { label: "Docs", href: "/docs", icon: DocsIcon },
      { label: "Status", href: "/status", icon: StatusIcon },
    ],
  },
];

/** Human label for the current route, shown in the top bar. */
export function sectionTitle(pathname: string): string {
  for (const group of NAV_GROUPS) {
    const match = group.items.find((item) => item.href === pathname);
    if (match) return match.label;
  }
  return "Overview";
}
