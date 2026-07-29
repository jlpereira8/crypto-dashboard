"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { scaleLinear, scaleTime } from "d3-scale";
import { area, curveLinear, line } from "d3-shape";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";
import { easing } from "../../lib/motion";
import {
  formatAxisDate,
  formatAxisPrice,
  formatPrice,
  formatTimestamp,
  type AxisSpan,
} from "../../lib/format";
import type { PricePoint } from "../../lib/market-api";
import { useChartWidth } from "./useChartSize";

/**
 * The price chart — plain SVG over d3 scales.
 *
 * Visual conventions taken from trading terminals rather than from generic
 * dashboard charts:
 *
 *  • **The price axis is on the right.** Every trading platform does this, so the
 *    scale sits beside the live edge of the series instead of behind its origin.
 *    It's the single strongest signal that this is a market chart.
 *  • **A last-price tag rides the right axis**, tinted by direction, with a
 *    dashed rule at that level. Dashing is right here — this annotates "where
 *    price is now", it is not a gridline.
 *  • **A full crosshair on hover**: vertical for time, horizontal for price, with
 *    the hovered price tagged on the axis.
 *  • **Linear interpolation.** A spline through daily closes invents prices the
 *    asset never traded at, which on a financial chart is a correctness problem
 *    rather than a stylistic one.
 *  • **Direction, not identity, drives colour.** The header always prints the
 *    signed percentage beside a caret, so direction never rests on hue alone.
 *
 * `animationKey` should change only when the asset or range changes; a background
 * refresh keeps the same key, so the draw-in doesn't replay.
 */

/** Plot insets. `right` holds the price axis; `left` is just breathing room. */
const MARGIN = { top: 14, right: 60, bottom: 22, left: 12 } as const;

const DAY_MS = 86_400_000;
const TAG_HEIGHT = 17;

export type PriceDirection = "up" | "down" | "flat";

export interface PriceChartProps {
  points: PricePoint[];
  /** Sets the mark colour. Always paired with a visible signed % in the header. */
  direction: PriceDirection;
  /** Names the series in the accessible summary and the tooltip. */
  seriesName: string;
  height?: number;
  /** Change only on asset/range changes, never on refetch. */
  animationKey?: string | number;
  /**
   * Formats a value in the tooltip and the accessible summary. Defaults to price
   * formatting; /status passes a millisecond formatter.
   */
  valueFormat?: (value: number) => string;
  /** Formats axis ticks and the axis tags. Defaults to compact price. */
  axisFormat?: (value: number) => string;
  className?: string;
}

interface Hovered {
  index: number;
  /** Keyboard hovers pin the readout and drive the live region. */
  source: "pointer" | "keyboard";
}

const COLOR_VAR: Record<PriceDirection, string> = {
  up: "--color-positive",
  down: "--color-negative",
  flat: "--color-ink-muted",
};

function findNearestIndex(points: PricePoint[], targetX: number): number {
  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (points[mid].x < targetX) low = mid + 1;
    else high = mid;
  }
  const after = low;
  const before = Math.max(0, low - 1);
  return targetX - points[before].x <= points[after].x - targetX ? before : after;
}

function axisSpan(spanMs: number): AxisSpan {
  if (spanMs <= DAY_MS * 1.5) return "hours";
  return spanMs >= DAY_MS * 120 ? "months" : "days";
}

export function PriceChart({
  points,
  direction,
  seriesName,
  height = 380,
  animationKey,
  valueFormat = formatPrice,
  axisFormat = formatAxisPrice,
  className,
}: PriceChartProps) {
  const { ref: containerRef, width } = useChartWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion() ?? false;

  const colorVar = COLOR_VAR[direction];
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
  const canRender = points.length > 1 && innerWidth > 0 && innerHeight > 0;

  const geometry = useMemo(() => {
    if (!canRender) return null;

    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    for (const point of points) {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }

    // Pad the value domain so the line never touches the top or bottom edge. A
    // perfectly flat series would otherwise produce a zero-height domain.
    const spread = maxY - minY;
    const pad = spread === 0 ? Math.max(Math.abs(maxY) * 0.01, 0.01) : spread * 0.16;

    // `scaleTime`, not `scaleLinear`: a linear scale over epoch milliseconds picks
    // "round" tick values in ms (~1.16 days for a week), so labels drift off day
    // boundaries and a day gets skipped. A time scale ticks on real calendar
    // units — days here, hours on the 24H range.
    const x = scaleTime().domain([minX, maxX]).range([MARGIN.left, MARGIN.left + innerWidth]);
    const y = scaleLinear()
      .domain([minY - pad, maxY + pad])
      .range([MARGIN.top + innerHeight, MARGIN.top])
      .nice(5);

    const lineGen = line<PricePoint>()
      .curve(curveLinear)
      .x((point) => x(point.x))
      .y((point) => y(point.y));

    const areaGen = area<PricePoint>()
      .curve(curveLinear)
      .x((point) => x(point.x))
      .y0(MARGIN.top + innerHeight)
      .y1((point) => y(point.y));

    return {
      x,
      y,
      linePath: lineGen(points) ?? "",
      areaPath: areaGen(points) ?? "",
      yTicks: y.ticks(5),
      xTicks: x.ticks(innerWidth < 340 ? 3 : innerWidth < 620 ? 5 : 7),
      span: axisSpan(maxX - minX),
      baseline: MARGIN.top + innerHeight,
      axisX: MARGIN.left + innerWidth,
    };
  }, [canRender, points, innerWidth, innerHeight]);

  const activePoint = hovered === null ? null : (points[hovered.index] ?? null);
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;

  /**
   * Accessible summary, built with a plain loop rather than `Math.min(...points)`
   * — spreading a 364-point series on every render is waste and, on longer
   * series, a stack-overflow risk.
   */
  const summary = useMemo(() => {
    if (points.length === 0) return "";
    let low = points[0].y;
    let high = points[0].y;
    for (const point of points) {
      if (point.y < low) low = point.y;
      if (point.y > high) high = point.y;
    }
    return (
      `${seriesName} price chart, ${points.length} points from ` +
      `${formatTimestamp(points[0].x)} to ${formatTimestamp(points[points.length - 1].x)}. ` +
      `Low ${valueFormat(low)}, high ${valueFormat(high)}. ` +
      `Use arrow keys to read individual points.`
    );
  }, [points, seriesName, valueFormat]);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!geometry) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Clamp into the plot area so edge movement still resolves to an end point.
      const clamped = Math.min(
        Math.max(event.clientX - rect.left, MARGIN.left),
        MARGIN.left + innerWidth,
      );
      const index = findNearestIndex(points, Number(geometry.x.invert(clamped)));
      setHovered((current) =>
        current?.index === index && current.source === "pointer"
          ? current
          : { index, source: "pointer" },
      );
    },
    [geometry, innerWidth, points],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGSVGElement>) => {
      if (points.length === 0) return;
      const last = points.length - 1;
      const current = hovered?.index ?? last;
      const jump = Math.max(1, Math.round(points.length / 20));

      let next: number;
      switch (event.key) {
        case "ArrowRight":
          next = Math.min(current + 1, last);
          break;
        case "ArrowLeft":
          next = Math.max(current - 1, 0);
          break;
        case "PageUp":
          next = Math.min(current + jump, last);
          break;
        case "PageDown":
          next = Math.max(current - jump, 0);
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = last;
          break;
        case "Escape":
          setHovered(null);
          return;
        default:
          return;
      }
      event.preventDefault();
      setHovered({ index: next, source: "keyboard" });
    },
    [hovered, points],
  );

  const gradientId = `price-fill-${direction}`;
  const readoutId = `price-readout-${direction}`;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)} style={{ height }}>
      {geometry && (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          tabIndex={0}
          role="img"
          aria-label={summary}
          aria-describedby={activePoint ? readoutId : undefined}
          className="focus-ring block touch-pan-y"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHovered((c) => (c?.source === "keyboard" ? c : null))}
          onKeyDown={onKeyDown}
          onBlur={() => setHovered((c) => (c?.source === "keyboard" ? null : c))}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              {/* A wash, not a block: fades to nothing well before the baseline. */}
              <stop offset="0%" style={{ stopColor: `var(${colorVar})`, stopOpacity: 0.2 }} />
              <stop offset="55%" style={{ stopColor: `var(${colorVar})`, stopOpacity: 0.05 }} />
              <stop offset="100%" style={{ stopColor: `var(${colorVar})`, stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {/* Gridlines: solid hairlines one step off the surface, horizontal only */}
          <g aria-hidden="true">
            {geometry.yTicks.map((tick) => (
              <line
                key={tick}
                x1={MARGIN.left}
                x2={geometry.axisX}
                y1={geometry.y(tick)}
                y2={geometry.y(tick)}
                style={{ stroke: "var(--color-grid)" }}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            ))}
            {/* The right-hand price axis rule */}
            <line
              x1={geometry.axisX}
              x2={geometry.axisX}
              y1={MARGIN.top}
              y2={geometry.baseline}
              style={{ stroke: "var(--color-axis)" }}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          </g>

          {/* Price ticks live outside the plot on the right — trading convention */}
          <g aria-hidden="true" className="fill-ink-muted text-[0.625rem] nums-tabular">
            {geometry.yTicks.map((tick) => (
              <text
                key={tick}
                x={geometry.axisX + 7}
                y={geometry.y(tick)}
                textAnchor="start"
                dominantBaseline="middle"
                fill="currentColor"
              >
                {axisFormat(tick)}
              </text>
            ))}
            {geometry.xTicks.map((tick, index) => (
              <text
                key={Number(tick)}
                x={geometry.x(tick)}
                y={height - 5}
                // Pull the first label inward so it can't clip the panel edge.
                textAnchor={index === 0 ? "start" : "middle"}
                fill="currentColor"
              >
                {formatAxisDate(Number(tick), geometry.span)}
              </text>
            ))}
          </g>

          {/* Marks */}
          <motion.path
            key={`area-${animationKey}`}
            d={geometry.areaPath}
            fill={`url(#${gradientId})`}
            initial={reduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: easing.out, delay: reduced ? 0 : 0.1 }}
          />
          <motion.path
            key={`line-${animationKey}`}
            d={geometry.linePath}
            fill="none"
            style={{ stroke: `var(${colorVar})` }}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduced ? undefined : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduced ? 0 : 0.6, ease: easing.out }}
          />

          {/* Last price: dashed threshold rule + an axis tag. Dashed is correct
              here — it annotates "price now"; it is not a gridline. */}
          {lastPoint && !activePoint && (
            <g aria-hidden="true">
              <line
                x1={MARGIN.left}
                x2={geometry.axisX}
                y1={geometry.y(lastPoint.y)}
                y2={geometry.y(lastPoint.y)}
                style={{ stroke: `var(${colorVar})`, opacity: 0.35 }}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <AxisTag
                x={geometry.axisX + 1}
                y={geometry.y(lastPoint.y)}
                width={MARGIN.right - 4}
                label={axisFormat(lastPoint.y)}
                background={`var(${colorVar})`}
                foreground="var(--color-canvas)"
              />
              <circle
                cx={geometry.x(lastPoint.x)}
                cy={geometry.y(lastPoint.y)}
                r={3}
                style={{ fill: `var(${colorVar})`, stroke: "var(--color-surface)" }}
                strokeWidth={2}
              />
            </g>
          )}

          {/* Crosshair: time on the vertical, price on the horizontal */}
          {activePoint && (
            <g aria-hidden="true">
              <line
                x1={geometry.x(activePoint.x)}
                x2={geometry.x(activePoint.x)}
                y1={MARGIN.top}
                y2={geometry.baseline}
                style={{ stroke: "var(--color-border-strong)" }}
                strokeWidth={1}
              />
              <line
                x1={MARGIN.left}
                x2={geometry.axisX}
                y1={geometry.y(activePoint.y)}
                y2={geometry.y(activePoint.y)}
                style={{ stroke: "var(--color-border-strong)" }}
                strokeWidth={1}
              />
              <AxisTag
                x={geometry.axisX + 1}
                y={geometry.y(activePoint.y)}
                width={MARGIN.right - 4}
                label={axisFormat(activePoint.y)}
                background="var(--color-ink)"
                foreground="var(--color-surface)"
              />
              <circle
                cx={geometry.x(activePoint.x)}
                cy={geometry.y(activePoint.y)}
                r={4}
                style={{ fill: `var(${colorVar})`, stroke: "var(--color-surface)" }}
                // 2px surface ring keeps the dot legible where it crosses the line
                strokeWidth={2}
              />
            </g>
          )}
        </svg>
      )}

      {/* Tooltip — value leads, timestamp follows, keyed by a short line stroke */}
      {geometry && activePoint && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2"
          style={{
            left: Math.min(
              Math.max(geometry.x(activePoint.x), 58),
              Math.max(geometry.axisX - 58, 58),
            ),
          }}
        >
          <div className="rounded bg-ink px-2 py-1 text-surface shadow-pop">
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-[2px] w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: `var(${colorVar})` }}
              />
              <span className="text-xs font-semibold nums-tabular">
                {valueFormat(activePoint.y)}
              </span>
            </div>
            <div className="mt-px whitespace-nowrap text-micro uppercase opacity-60 nums-tabular">
              {formatTimestamp(activePoint.x)}
            </div>
          </div>
        </div>
      )}

      {/* Live only while keyboard-driven, so pointer movement doesn't flood a
          screen reader with announcements. */}
      <p
        id={readoutId}
        className="sr-only"
        aria-live={hovered?.source === "keyboard" ? "polite" : "off"}
      >
        {activePoint
          ? `${seriesName}: ${valueFormat(activePoint.y)} at ${formatTimestamp(activePoint.x)}`
          : ""}
      </p>
    </div>
  );
}

/**
 * A value tag sitting on the price axis.
 *
 * `foreground` is passed in rather than derived, because the two callers need
 * opposite treatments: the last-price tag is tinted by direction and takes the
 * canvas colour for its text, while the crosshair tag is the inverted
 * ink/surface pair. Both combinations were contrast-checked in both themes.
 */
function AxisTag({
  x,
  y,
  width,
  label,
  background,
  foreground,
}: {
  x: number;
  y: number;
  width: number;
  label: string;
  background: string;
  foreground: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y - TAG_HEIGHT / 2}
        width={width}
        height={TAG_HEIGHT}
        rx={3}
        style={{ fill: background }}
      />
      <text
        x={x + width / 2}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[0.625rem] font-semibold nums-tabular"
        style={{ fill: foreground }}
      >
        {label}
      </text>
    </g>
  );
}
