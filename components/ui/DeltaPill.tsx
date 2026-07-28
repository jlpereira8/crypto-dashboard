import React from "react";
import { cn } from "../../lib/cn";
import { describeDelta, formatPercent } from "../../lib/format";

export interface DeltaPillProps {
  value: number | null | undefined;
  /** Named period, used in the screen-reader label ("past 7 days"). */
  period?: string;
  size?: "sm" | "md" | "lg";
  /** Drop the tinted background. The default for dense table rows. */
  bare?: boolean;
  className?: string;
}

/**
 * Signed price change.
 *
 * Restyled toward the trading-terminal convention: bare tabular numerals in the
 * direction colour with a small caret, rather than a rounded tinted chip. Chips
 * everywhere is the single strongest "admin template" tell — in a dense market
 * table forty of them turn the numeric column into visual noise, and the number
 * itself stops being the thing you read.
 *
 * Direction is still encoded three ways — caret, numeric sign, and colour — so
 * it survives colourblindness, greyscale print and forced-colours mode. The
 * visible text is `aria-hidden` and replaced with a spelled-out label, because
 * "+2.41%" is read inconsistently across screen readers.
 */
export function DeltaPill({
  value,
  period = "24 hours",
  size = "md",
  bare = false,
  className,
}: DeltaPillProps) {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const direction = !hasValue ? "flat" : value > 0 ? "up" : value < 0 ? "down" : "flat";

  const ink =
    direction === "up" ? "text-positive" : direction === "down" ? "text-negative" : "text-ink-muted";

  const tint =
    direction === "up"
      ? "bg-positive-soft"
      : direction === "down"
        ? "bg-negative-soft"
        : "bg-surface-subtle";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-baseline gap-[0.2em] font-medium leading-none nums-tabular",
        size === "sm" ? "text-xs" : size === "lg" ? "text-sm" : "text-xs",
        ink,
        // The tinted form is reserved for the one delta that needs emphasis:
        // the selected asset's change in the chart header.
        !bare && cn("rounded px-1.5 py-1 font-semibold", tint),
        className,
      )}
    >
      <span aria-hidden="true" className="text-[0.75em] leading-none">
        {direction === "up" ? "▲" : direction === "down" ? "▼" : "—"}
      </span>
      <span aria-hidden="true">{hasValue ? formatPercent(value) : "—"}</span>
      <span className="sr-only">{describeDelta(value, period)}</span>
    </span>
  );
}
