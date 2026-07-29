import React, { useId } from "react";
import { cn } from "../../lib/cn";

/**
 * The CryptoBay logomark.
 *
 * Pixel art: a violet "C" enclosing three ascending candlesticks on a
 * transparent canvas. Same identity as the full artwork in
 * `public/brand/logo.svg`, which adds a sunset, a shoreline and a palm tree —
 * this is that artwork with the fine detail removed rather than shrunk.
 *
 * That split is measured, not stylistic. The artwork was rasterized at 512, 192,
 * 32, 24 and 16px and inspected: it is excellent down to ~48px, readable at
 * 32px, and at 24px — the size this component actually renders — the three
 * candle bodies fuse into one blob and the palm disappears entirely. So the
 * artwork ships where it has room (PWA icons at 192/512, apple-touch at 180) and
 * this reduced mark ships at 24px and in the favicon.
 *
 * Authored on a 24-unit grid so one unit is one device pixel at 24px: every edge
 * lands on a pixel boundary and nothing is antialiased. `shapeRendering` keeps
 * the browser from softening the steps. Scaling this to a non-multiple of 24
 * reintroduces blur, so prefer 24 or 48.
 *
 * Inlined rather than loaded from `/icon.svg`: it is ~1.2 kB, and an <img> here
 * would mean a request that can miss and a first paint with a hole in the
 * sidebar. The paths below are generated — edit the geometry in
 * `scripts/logo/generate-mark.mjs` and paste its output here, rather than
 * editing the path data by hand. See `scripts/logo/README.md`.
 */

/** Ring, then candles left to right. Only the ring takes the gradient. */
const RING =
  "M10 2h3v1h-3zM7 3h9v1h-9zM6 4h11v1h-11zM4 5h6v1h-6zM13 5h6v1h-6zM4 6h4v1h-4zM15 6h4v1h-4zM3 7h4v1h-4zM16 7h2v1h-2zM3 8h3v1h-3zM2 9h3v1h-3zM2 10h3v1h-3zM2 11h3v1h-3zM2 12h3v1h-3zM2 13h3v1h-3zM2 14h3v1h-3zM3 15h3v1h-3zM3 16h4v1h-4zM16 16h2v1h-2zM4 17h4v1h-4zM15 17h4v1h-4zM4 18h6v1h-6zM13 18h6v1h-6zM6 19h11v1h-11zM7 20h9v1h-9zM10 21h3v1h-3z";

const CANDLES: readonly { fill: string; d: string }[] = [
  {
    fill: "#b163f8",
    d: "M7 10h1v1h-1zM7 11h1v1h-1zM6 12h3v1h-3zM6 13h3v1h-3zM6 14h3v1h-3zM6 15h3v1h-3zM6 16h3v1h-3zM7 17h1v1h-1z",
  },
  {
    fill: "#4d7cf3",
    d: "M11 8h1v1h-1zM11 9h1v1h-1zM10 10h3v1h-3zM10 11h3v1h-3zM10 12h3v1h-3zM10 13h3v1h-3zM10 14h3v1h-3zM10 15h3v1h-3zM11 16h1v1h-1z",
  },
  {
    fill: "#2ecdf2",
    d: "M15 7h1v1h-1zM14 8h3v1h-3zM14 9h3v1h-3zM14 10h3v1h-3zM14 11h3v1h-3zM14 12h3v1h-3zM14 13h3v1h-3zM14 14h3v1h-3zM15 15h1v1h-1z",
  },
];

/**
 * The mark's colours are fixed rather than themed. It is a logo, so it has to
 * remain the same object in light and dark mode.
 */
export function BrandMark({ className }: { className?: string }) {
  // Namespaced so a second instance (the mobile drawer renders its own) can't
  // collide on the gradient and clip-path ids.
  const uid = useId();
  const gradientId = `cb-ring-${uid}`;
  const clipId = `cb-clip-${uid}`;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      className={cn("h-6 w-6 shrink-0 rounded-md shadow-xs", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7059fb" />
          <stop offset="1" stopColor="#8f3ad9" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="24" height="24" rx="5.3" ry="5.3" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path fill={`url(#${gradientId})`} d={RING} />
        {CANDLES.map((candle) => (
          <path key={candle.fill} fill={candle.fill} d={candle.d} />
        ))}
      </g>
    </svg>
  );
}
