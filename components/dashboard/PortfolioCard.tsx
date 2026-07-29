import React from "react";
import Link from "next/link";
import { cn } from "../../lib/cn";
import {
  formatCurrencyCompact,
  formatPercentPlain,
  formatPrice,
  formatSignedPrice,
} from "../../lib/format";
import type { PortfolioValuation } from "../../lib/portfolio";
import { DonutChart, describeAllocation } from "../charts/DonutChart";
import { Badge, Card, CardHeader, CardTitle, DeltaPill, Skeleton, StatLabel, Tooltip } from "../ui";

/** Matches Button's primary/sm treatment, on an anchor. */
const SWAP_LINK_CLASS = cn(
  "focus-ring inline-flex h-7 select-none items-center justify-center rounded px-2.5",
  "bg-accent text-xs font-medium text-accent-ink shadow-xs",
  "transition-[background-color,transform] duration-fast ease-out",
  "hover:bg-accent-hover active:scale-[0.985]",
);

export interface PortfolioCardProps {
  valuation: PortfolioValuation;
  isLoading: boolean;
  /**
   * In-page anchor of a swap panel (e.g. "#swap"). A plain <a> on purpose — this
   * is a fragment on the current document, not a route.
   */
  swapHref?: string;
  /** Links to the full portfolio route. */
  detailHref?: string;
}
/**
 * Wallet summary: value, today's move, allocation ring, holdings.
 *
 * Units and cost basis are fixtures, but every figure here is computed from live
 * prices — so the total, the day's move and each share are real arithmetic rather
 * than typed-in numbers.
 *
 * The ring is `aria-hidden`; the rows below state every label, share and value as
 * text, so nothing is reachable only by reading a chart. Each row's dot matches
 * the segment representing it, and holdings past the ring's three slots share the
 * neutral "Other" swatch.
 */
export function PortfolioCard({
  valuation,
  isLoading,
  swapHref,
  detailHref,
}: PortfolioCardProps) {
  const { totalValueUsd, todayPnlUsd, todayPnlPct, holdings, slices, hasMissingPrices } = valuation;

  return (
    <Card padding="none">
      <CardHeader bleed>
        <CardTitle>Portfolio</CardTitle>
        <div className="flex items-center gap-2">
          {detailHref && (
            <Link
              href={detailHref}
              className="focus-ring rounded px-1 py-0.5 text-micro font-medium uppercase text-accent-text transition-colors duration-fast hover:bg-accent-soft"
            >
              Details
            </Link>
          )}
          <Tooltip content="Fixture holdings valued at live prices — no wallet is connected">
            <Badge tabIndex={0} className="cursor-help">
              Sample
            </Badge>
          </Tooltip>
        </div>
      </CardHeader>

      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <StatLabel>Total value</StatLabel>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-28" />
          ) : (
            <p className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">
              {formatPrice(totalValueUsd)}
            </p>
          )}

          {isLoading ? (
            <Skeleton className="mt-1.5 h-3 w-24" />
          ) : (
            <p className="mt-0.5 flex items-center gap-1.5 text-micro uppercase text-ink-muted">
              <span>Today</span>
              <span
                className={cn(
                  "font-semibold nums-tabular",
                  (todayPnlUsd ?? 0) > 0
                    ? "text-positive"
                    : (todayPnlUsd ?? 0) < 0
                      ? "text-negative"
                      : "text-ink-muted",
                )}
              >
                {formatSignedPrice(todayPnlUsd)}
              </span>
              <DeltaPill value={todayPnlPct} period="24 hours" size="sm" bare />
            </p>
          )}

          {swapHref && (
            <a href={swapHref} className={cn(SWAP_LINK_CLASS, "mt-2.5")}>
              Swap assets
            </a>
          )}
        </div>

        {isLoading ? (
          <Skeleton shape="circle" className="h-[92px] w-[92px] shrink-0" />
        ) : (
          <DonutChart slices={slices} size={92} className="shrink-0" />
        )}
      </div>

      <ul
        aria-label={isLoading ? "Loading allocation" : `Allocation: ${describeAllocation(slices)}`}
        className="divide-y divide-line-subtle border-t border-line"
      >
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="flex items-center gap-2.5 px-4 py-2" aria-hidden="true">
                <Skeleton shape="circle" className="h-2 w-2" />
                <Skeleton className="h-2.5 flex-1" />
                <Skeleton className="h-2.5 w-12" />
              </li>
            ))
          : holdings.map((holding) => (
              <li key={holding.id} className="flex items-center gap-2.5 px-4 py-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(${holding.colorVar})` }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-ink">
                    {holding.name}
                  </span>
                  <span className="block text-micro uppercase text-ink-muted nums-tabular">
                    {holding.units.toLocaleString("en-US", { maximumFractionDigits: 4 })}{" "}
                    {holding.symbol}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs font-medium text-ink nums-tight">
                    {formatCurrencyCompact(holding.valueUsd)}
                  </span>
                  <span className="block text-micro text-ink-muted nums-tabular">
                    {formatPercentPlain(holding.share)}
                  </span>
                </span>
              </li>
            ))}
      </ul>

      {hasMissingPrices && !isLoading && (
        <p className="border-t border-line px-4 py-2 text-micro uppercase text-ink-muted">
          Some prices unavailable — total is partial
        </p>
      )}
    </Card>
  );
}
