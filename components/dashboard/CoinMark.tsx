import React, { useState } from "react";
import { cn } from "../../lib/cn";

const SIZES = {
  sm: "h-5 w-5 text-[0.4375rem]",
  md: "h-6 w-6 text-[0.5rem]",
} as const;

export interface CoinMarkProps {
  src?: string;
  symbol: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Coin logo with a monogram fallback.
 *
 * `alt=""` on purpose: every use site renders the coin's name immediately
 * beside the mark, so labelling the image would make a screen reader announce
 * the same asset twice.
 *
 * Uses a plain `<img>` rather than `next/image`. CoinPaprika's static CDN already
 * serves these larger than the rendered box, and the optimiser would need a
 * remote-pattern allowlist plus a server round-trip per logo to produce the same
 * 20px result. Explicit width/height still prevents layout shift.
 */
export function CoinMark({ src, symbol, size = "sm", className }: CoinMarkProps) {
  const [failed, setFailed] = useState(false);
  const pixels = size === "sm" ? 20 : 24;

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-surface-subtle font-semibold uppercase",
          "text-ink-secondary ring-1 ring-line",
          SIZES[size],
          className,
        )}
      >
        {symbol.slice(0, 3)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={pixels}
      height={pixels}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full bg-surface-subtle ring-1 ring-line", SIZES[size], className)}
    />
  );
}
