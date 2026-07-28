import React from "react";
import { cn } from "../../lib/cn";

const TONES = {
  neutral: "bg-surface-subtle text-ink-secondary",
  accent: "bg-accent-soft text-accent-text",
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-negative",
  outline: "text-ink-secondary ring-1 ring-inset ring-line-strong",
} as const;

const SIZES = {
  sm: "h-[1.125rem] px-1 text-micro",
  md: "h-5 px-1.5 text-2xs",
} as const;

export type BadgeTone = keyof typeof TONES;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: keyof typeof SIZES;
}

/**
 * Compact status/metadata label. `positive` and `negative` tones carry meaning,
 * so callers must include a glyph or word alongside them — colour never carries
 * state on its own (see DeltaPill for the delta case).
 */
export function Badge({ tone = "neutral", size = "md", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-sm font-medium leading-none",
        TONES[tone],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

