import React from "react";
import Link from "next/link";
import { cn } from "../../lib/cn";
import { useSession } from "../../lib/useSession";
import { Tooltip } from "../ui";
import { ACCOUNT, BRAND, NAV_GROUPS } from "./navigation";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

export interface SidebarNavProps {
  pathname: string;
  /** Called when a link is followed, so the mobile drawer can close itself. */
  onNavigate?: () => void;
  /** The drawer supplies its own header, so the brand block is suppressed. */
  showBrand?: boolean;
  /** Opens the sign-in dialog. Omitted, the account row is inert. */
  onSignIn?: () => void;
}

/**
 * The sidebar's contents, shared verbatim between the fixed desktop rail and the
 * mobile drawer. One source of truth for nav markup means the two can't drift.
 *
 * Active state is a filled row rather than a left accent bar: at this width the
 * fill reads instantly, and a rail plus a fill is two cues for one state.
 */
export function SidebarNav({
  pathname,
  onNavigate,
  showBrand = true,
  onSignIn,
}: SidebarNavProps) {
  const { session, signOut } = useSession();
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
      <div className="flex shrink-0 items-center gap-1.5 border-t border-line p-2">
        {session ? (
          <>
            <Avatar />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-ink">{session.name}</span>
              <span className="block truncate text-micro text-ink-muted">{session.detail}</span>
            </span>
            <Tooltip content="Sign out">
              <button
                type="button"
                onClick={signOut}
                aria-label="Sign out"
                className={cn(
                  "focus-ring grid h-7 w-7 shrink-0 place-items-center rounded",
                  "text-ink-muted transition-colors duration-fast",
                  "hover:bg-surface-subtle hover:text-ink",
                )}
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                  <path
                    d="M6.5 13.5H3.75A1.25 1.25 0 0 1 2.5 12.25v-8.5A1.25 1.25 0 0 1 3.75 2.5H6.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10.5 11 13.5 8l-3-3M13.5 8H6"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </Tooltip>
          </>
        ) : (
          /* As a guest the whole block is the affordance — a separate button in a
             216px rail would crowd out the identity it sits beside. */
          <button
            type="button"
            onClick={onSignIn}
            disabled={!onSignIn}
            className={cn(
              "focus-ring flex min-w-0 flex-1 items-center gap-2 rounded p-1 text-left",
              "transition-colors duration-fast",
              onSignIn && "hover:bg-surface-subtle",
            )}
          >
            <Avatar />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-ink">{ACCOUNT.name}</span>
              <span className="block truncate text-micro text-accent-text">
                {onSignIn ? "Sign in" : ACCOUNT.status}
              </span>
            </span>
          </button>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
}

/** Person glyph rather than initials: initials imply a name we may not have. */
function Avatar() {
  return (
    <span
      aria-hidden="true"
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-subtle text-ink-muted ring-1 ring-line"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
        <circle cx="8" cy="5.75" r="2.6" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M3.4 13.2c.6-2.3 2.4-3.6 4.6-3.6s4 1.3 4.6 3.6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
