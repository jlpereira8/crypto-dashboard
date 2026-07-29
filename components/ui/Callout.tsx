import React from "react";
import { cn } from "../../lib/cn";

const TONES = {
  info: {
    frame: "bg-accent-soft ring-accent-line",
    ink: "text-accent-text",
    glyph: "i",
  },
  positive: {
    frame: "bg-positive-soft ring-positive-line",
    ink: "text-positive",
    glyph: "✓",
  },
  warning: {
    frame: "bg-negative-soft ring-negative-line",
    ink: "text-negative",
    glyph: "!",
  },
  neutral: {
    frame: "bg-surface-subtle ring-line",
    ink: "text-ink-secondary",
    glyph: "•",
  },
} as const;

export interface CalloutProps {
  tone?: keyof typeof TONES;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * An aside in documentation prose.
 *
 * The glyph is a text character rather than colour alone, so the tone survives
 * greyscale and colour-vision differences. `warning` uses `role="note"` rather
 * than `role="alert"` — nothing here is urgent or live, and an alert role would
 * interrupt a screen reader mid-sentence while reading docs.
 */
export function Callout({ tone = "info", title, children, className }: CalloutProps) {
  const style = TONES[tone];
  return (
    <div
      role="note"
      className={cn(
        "flex gap-2.5 rounded-lg p-3 ring-1 ring-inset",
        style.frame,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full text-micro font-bold",
          "bg-surface",
          style.ink,
        )}
      >
        {style.glyph}
      </span>
      <div className="min-w-0 text-xs leading-relaxed text-ink-secondary">
        {title && <p className={cn("font-semibold", style.ink)}>{title}</p>}
        <div className={cn(title && "mt-0.5")}>{children}</div>
      </div>
    </div>
  );
}
