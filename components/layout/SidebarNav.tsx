import React from "react";
import Link from "next/link";
import { cn } from "../../lib/cn";
import { BRAND, NAV_GROUPS } from "./navigation";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

export interface SidebarNavProps {
  pathname: string;
  /** Called when a link is followed, so the mobile drawer can close itself. */
  onNavigate?: () => void;
  /** The drawer supplies its own header, so the brand block is suppressed. */
  showBrand?: boolean;
}

/**
 * The sidebar's contents, shared verbatim between the fixed desktop rail and the
 * mobile drawer. One source of truth for nav markup means the two can't drift.
 *
 * Active state is a filled row rather than a left accent bar: at this width the
 * fill reads instantly, and a rail plus a fill is two cues for one state.
 */
export function SidebarNav({ pathname, onNavigate, showBrand = true }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col">
      {showBrand && (
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
          <Link
            href="/"
            onClick={onNavigate}
            className="focus-ring flex items-center gap-2 rounded py-1"
            aria-label={`${BRAND} home`}
          >
            <BrandMark />
            <span className="text-sm font-semibold tracking-tight text-ink">{BRAND}</span>
          </Link>
        </div>
      )}

      <nav aria-label="Main" className="flex-1 overflow-y-auto scrollbar-slim p-2">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? "primary"} className={index > 0 ? "mt-5" : undefined}>
            {group.label && (
              <p className="px-2 pb-1.5 text-micro font-medium uppercase text-ink-muted">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "focus-ring flex items-center gap-2 rounded px-2 py-1.5 text-xs font-medium",
                        "transition-colors duration-fast",
                        active
                          ? "bg-accent-soft text-accent-text"
                          : "text-ink-secondary hover:bg-surface-subtle hover:text-ink",
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", !active && "text-ink-muted")} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account and appearance live at the foot of the rail, out of the way of
          navigation but always reachable — the Linear/Slack convention. */}
      <div className="flex shrink-0 items-center gap-2 border-t border-line p-2">
        <span
          aria-hidden="true"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-subtle text-micro font-semibold text-ink-secondary ring-1 ring-line"
        >
          EW
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-ink">Elizabeth W.</span>
          <span className="block truncate text-micro text-ink-muted">Demo account</span>
        </span>
        <ThemeToggle />
      </div>
    </div>
  );
}
