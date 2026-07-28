import React from "react";
import { cn } from "../../lib/cn";

export interface EmptyStateProps {
  /** `error` switches the glyph frame to the negative tone. */
  tone?: "neutral" | "error";
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Shared empty / error placeholder. One component covers "no data", "no search
 * results" and "request failed" so the three never drift apart visually — the
 * previous code had three different one-line fallbacks, one of them an
 * unstyled `<div>Loading...</div>`.
 *
 * Error variants get `role="status"` so the failure is announced without
 * stealing focus.
 */
export function EmptyState({
  tone = "neutral",
  icon,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      role={tone === "error" ? "status" : undefined}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "gap-2 px-4 py-7" : "gap-2.5 px-6 py-10",
        className,
      )}
    >
      {icon && (
        <div
          aria-hidden="true"
          className={cn(
            "grid place-items-center rounded-lg ring-1",
            size === "sm" ? "h-7 w-7" : "h-9 w-9",
            tone === "error"
              ? "bg-negative-soft text-negative ring-negative-line"
              : "bg-surface-subtle text-ink-muted ring-line",
          )}
        >
          {icon}
        </div>
      )}

      <div className="space-y-1">
        <p className={cn("font-medium text-ink", size === "sm" ? "text-xs" : "text-sm")}>{title}</p>
        {description && (
          <p className={cn("mx-auto max-w-xs text-ink-muted", size === "sm" ? "text-2xs" : "text-xs")}>
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

/* ── Glyphs used by empty states ─────────────────────────────────────────── */

export function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4", className)} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 11.5l3.5-4L8 9.5 14 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4", className)} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.5 1.5 13.5h13L8 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 6.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4", className)} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
