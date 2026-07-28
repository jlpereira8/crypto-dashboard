"use client";

import React, { useMemo } from "react";
import { arc, pie } from "d3-shape";
import { formatPercentPlain } from "../../lib/format";

/**
 * Allocation ring.
 *
 * Uses d3-shape's `pie`/`arc`, already in the bundle for the price chart, so this
 * adds no dependency.
 *
 * Segments are separated by a `padAngle` gap in the surface colour rather than by
 * a stroke around each arc. A stroke would add ink that isn't data and thickens
 * every boundary; the gap does the separating with nothing.
 *
 * Purely decorative from an accessibility standpoint — `aria-hidden`, because the
 * legend rows beside it state every label, share and value as text. The ring is
 * the glanceable summary, the list is the accessible source of truth.
 */

export interface DonutSlice {
  id: string;
  label: string;
  /** Share of the whole, 0–100. */
  share: number;
  /** CSS custom property holding the segment colour. */
  colorVar: string;
}

export interface DonutChartProps {
  slices: DonutSlice[];
  /** Outer diameter in px. */
  size?: number;
  /** Ring thickness as a fraction of the radius. */
  thickness?: number;
  className?: string;
}

/** 2px of surface between segments, expressed as an angle at this radius. */
const GAP_PX = 2;

export function DonutChart({
  slices,
  size = 96,
  thickness = 0.34,
  className,
}: DonutChartProps) {
  const radius = size / 2;

  const arcs = useMemo(() => {
    const usable = slices.filter((slice) => slice.share > 0);
    if (usable.length === 0) return [];

    const layout = pie<DonutSlice>()
      .value((slice) => slice.share)
      // Preserve the caller's order (already largest-first) instead of d3's
      // default descending re-sort, so segment order matches the legend.
      .sort(null)
      .padAngle(usable.length > 1 ? GAP_PX / radius : 0);

    const shape = arc<ReturnType<typeof layout>[number]>()
      .innerRadius(radius * (1 - thickness))
      .outerRadius(radius)
      .cornerRadius(1);

    return layout(usable).map((datum) => ({
      id: datum.data.id,
      colorVar: datum.data.colorVar,
      path: shape(datum) ?? "",
    }));
  }, [slices, radius, thickness]);

  if (arcs.length === 0) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={radius}
            cy={radius}
            r={radius - (radius * thickness) / 2}
            fill="none"
            style={{ stroke: "var(--color-surface-subtle)" }}
            strokeWidth={radius * thickness}
          />
        </svg>
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g transform={`translate(${radius},${radius})`}>
        {arcs.map((segment) => (
          <path key={segment.id} d={segment.path} style={{ fill: `var(${segment.colorVar})` }} />
        ))}
      </g>
    </svg>
  );
}

/** Screen-reader sentence describing an allocation, for the list that owns it. */
export function describeAllocation(slices: DonutSlice[]): string {
  if (slices.length === 0) return "No allocation data";
  return slices
    .map((slice) => `${slice.label} ${formatPercentPlain(slice.share)}`)
    .join(", ");
}
