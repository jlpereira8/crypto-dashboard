import React, { useId, useMemo } from "react";
import { cn } from "../../lib/cn";
import { formatInteger, formatPercent, formatPercentPlain } from "../../lib/format";
import type { Asset } from "../../lib/market-api";
import { marketBreadth } from "../../lib/market-view";
import { Badge, CardTitle, Skeleton, StatLabel, Tooltip } from "../ui";

export interface MarketBreadthProps {
  assets: Asset[] | undefined;
  isLoading: boolean;
}

/**
 * Market breadth — how broad the day's move is.
 *
 * A region, not a card: it lives in the workspace column alongside the chart and
 * the market table, so it takes their treatment — flush to the edges, bounded by
 * hairlines, no radius or shadow. Cards are reserved for the right rail, where
 * they read as tools placed *on* the workspace rather than as part of it.
 *
 * This is also the honest form of a sentiment gauge. A "fear and greed" index
 * would need a second provider or an invented number; breadth is counted directly
 * from the list already on screen, and the panel states its own sample size so the
 * reader knows it describes the top 50 rather than the whole market.
 *
 * The proportion bar is two segments separated by a gap in the surface colour, and
 * both counts are labelled in text beside it — the ratio never rests on colour.
 */
export function MarketBreadth({ assets, isLoading }: MarketBreadthProps) {
  const headingId = `${useId()}-breadth`;
  const breadth = useMemo(() => marketBreadth(assets), [assets]);
  const { advancing, declining, measured, advancingShare, averageChangePct } = breadth;

  const decliningShare = advancingShare === null ? null : 100 - advancingShare;

  return (
    <section aria-labelledby={headingId} className="flex flex-col bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5 sm:px-5">
        <CardTitle id={headingId}>Market breadth</CardTitle>
        <Tooltip content="Counted from the assets on this page, not the whole market">
          <Badge tabIndex={0} size="sm" className="cursor-help uppercase">
            Top {isLoading ? "50" : formatInteger(measured)}
          </Badge>
        </Tooltip>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3.5 sm:px-5">
        {/* Headline: the share advancing is the gauge. */}
        <div>
          <StatLabel>Advancing</StatLabel>
          {isLoading ? (
            <Skeleton className="mt-1 h-8 w-24" />
          ) : (
            <p className="mt-0.5 flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-2xl font-semibold tracking-tight",
                  advancingShare === null
                    ? "text-ink"
                    : advancingShare >= 50
                      ? "text-positive"
                      : "text-negative",
                )}
              >
                {formatPercentPlain(advancingShare)}
              </span>
              <span className="text-micro uppercase text-ink-muted nums-tabular">
                of {formatInteger(measured)} assets
              </span>
            </p>
          )}
        </div>

        {/* Proportion bar */}
        {isLoading ? (
          <Skeleton className="h-2 w-full rounded-full" />
        ) : measured === 0 ? (
          <p className="text-xs text-ink-muted">No 24-hour change data available.</p>
        ) : (
          <div>
            <div
              className="flex h-2 gap-[2px] overflow-hidden rounded-full bg-surface-subtle"
              role="img"
              aria-label={`${formatInteger(advancing)} of ${formatInteger(measured)} assets advancing, ${formatInteger(declining)} declining`}
            >
              {advancing > 0 && (
                <span
                  className="h-full rounded-full bg-positive"
                  style={{ width: `${advancingShare ?? 0}%` }}
                />
              )}
              {declining > 0 && (
                <span
                  className="h-full rounded-full bg-negative"
                  style={{ width: `${decliningShare ?? 0}%` }}
                />
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-positive" />
                <span className="font-medium text-ink nums-tabular">
                  {formatInteger(advancing)}
                </span>
                <span className="text-ink-muted">up</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-ink-muted">down</span>
                <span className="font-medium text-ink nums-tabular">
                  {formatInteger(declining)}
                </span>
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-negative" />
              </span>
            </div>
          </div>
        )}

        {/* Average move */}
        {/* `mt-auto` collects all the slack here, so a tall region has one gap
            above the footer instead of two gaps splitting the content apart. */}
        <dl className="mt-auto flex items-baseline justify-between gap-2 border-t border-line pt-2.5 text-xs">
          <dt className="text-ink-muted">Average 24h move</dt>
          {isLoading ? (
            <Skeleton className="h-3 w-14" />
          ) : (
            <dd
              className={cn(
                "font-medium nums-tabular",
                (averageChangePct ?? 0) > 0
                  ? "text-positive"
                  : (averageChangePct ?? 0) < 0
                    ? "text-negative"
                    : "text-ink",
              )}
            >
              {formatPercent(averageChangePct)}
            </dd>
          )}
        </dl>
      </div>
    </section>
  );
}
