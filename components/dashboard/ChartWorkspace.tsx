import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { cn } from "../../lib/cn";
import {
  formatCurrencyCompact,
  formatPrice,
  formatRelativeTime,
} from "../../lib/format";
import { RANGES, getRange, type Asset, type PricePoint, type RangeId } from "../../lib/market-api";
import { seriesChangePct, seriesExtent } from "../../lib/market-view";
import type { PriceDirection } from "../charts/PriceChart";
import {
  AlertIcon,
  Button,
  ChartIcon,
  DeltaPill,
  EmptyState,
  SegmentedControl,
  Skeleton,
  StatLabel,
} from "../ui";
import { CoinMark } from "./CoinMark";

/**
 * Tall on purpose. As the workspace's subject the chart gets the majority of the
 * viewport — the proportion a trading platform gives it — rather than the polite
 * 300px a dashboard widget would take.
 */
const CHART_HEIGHT = 400;

/** Stable identity for the "no data yet" case, so useMemo below can cache. */
const NO_POINTS: PricePoint[] = [];

/**
 * The chart engine carries d3-scale and d3-shape and must measure the DOM before
 * it can draw, so it is client-only and fetched on demand. The placeholder is the
 * same skeleton the loading state uses — no layout shift.
 */
const PriceChart = dynamic(() => import("../charts/PriceChart").then((m) => m.PriceChart), {
  ssr: false,
  loading: () => <ChartPlaceholder />,
});

export interface ChartWorkspaceProps {
  asset: Asset | undefined;
  points: PricePoint[] | undefined;
  range: RangeId;
  onRangeChange: (range: RangeId) => void;
  /** True only while the first series for this asset/range loads. */
  isLoading: boolean;
  /** True while refreshing over a series we're still showing. */
  isRefreshing: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * The chart region.
 *
 * Not a card — a region. It has no radius, no shadow and no outer margin; it is
 * bounded by the hairlines of the regions around it and its plot runs to the
 * workspace edge. That is the difference between a dashboard widget and a
 * trading surface, and it is why the price sits on its own line at display size
 * with nothing else competing on the page.
 */
export function ChartWorkspace({
  asset,
  points,
  range,
  onRangeChange,
  isLoading,
  isRefreshing,
  isError,
  onRetry,
}: ChartWorkspaceProps) {
  const rangeMeta = getRange(range);
  const series = points ?? NO_POINTS;
  const { changePct, low, high } = useMemo(
    () => ({ changePct: seriesChangePct(series), ...seriesExtent(series) }),
    [series],
  );

  const direction: PriceDirection =
    changePct === null || changePct === 0 ? "flat" : changePct > 0 ? "up" : "down";

  return (
    <section
      aria-label="Selected asset price chart"
      className={cn(
        "bg-surface transition-opacity duration-base",
        isRefreshing && !isLoading && "opacity-[0.55]",
      )}
    >
      {/* ── Identity / price / range, one dense band ────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 pb-3 pt-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {isLoading && !asset ? (
            <Skeleton shape="circle" className="h-8 w-8" />
          ) : (
            <CoinMark src={asset?.logoUrl} symbol={asset?.symbol ?? "—"} size="md" />
          )}

          <div className="min-w-0">
            {asset ? (
              <div className="flex min-w-0 items-baseline gap-1.5">
                <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                  {asset.name}
                </h2>
                <span className="shrink-0 text-micro font-medium uppercase text-ink-muted">
                  {asset.symbol} · #{asset.rank}
                </span>
              </div>
            ) : (
              <Skeleton className="h-3 w-28" />
            )}

            {/* The page's single display figure. */}
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {asset ? (
                <span className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  {formatPrice(asset.price)}
                </span>
              ) : (
                <Skeleton className="h-9 w-40" />
              )}
              {!isLoading && !isError && (
                <DeltaPill value={changePct} period={rangeMeta.description} size="lg" />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <SegmentedControl
            label="Chart time range"
            value={range}
            onChange={onRangeChange}
            options={RANGES.map((r) => ({
              value: r.id,
              label: r.label,
              description: r.description,
            }))}
          />
          <p className="text-micro uppercase text-ink-muted nums-tabular">
            {asset?.lastUpdated
              ? `Updated ${formatRelativeTime(asset.lastUpdated)}`
              : "Awaiting data"}
          </p>
        </div>
      </div>

      {/* ── Plot, edge to edge ──────────────────────────────────────────── */}
      {isError && series.length === 0 ? (
        <div style={{ height: CHART_HEIGHT }} className="grid place-items-center">
          <EmptyState
            tone="error"
            icon={<AlertIcon />}
            title="Price history unavailable"
            description="We couldn't load this asset's price history. It may be a temporary rate limit."
            action={
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            }
          />
        </div>
      ) : isLoading ? (
        <ChartPlaceholder />
      ) : series.length === 0 ? (
        <div style={{ height: CHART_HEIGHT }} className="grid place-items-center">
          <EmptyState
            icon={<ChartIcon />}
            title="No price history"
            description={`The provider has no data for ${asset?.name ?? "this asset"} over the ${rangeMeta.description}.`}
          />
        </div>
      ) : (
        <PriceChart
          points={series}
          direction={direction}
          seriesName={asset?.name ?? "Selected asset"}
          height={CHART_HEIGHT}
          // Only asset/range changes replay the draw-in; a refetch does not.
          animationKey={`${asset?.id ?? "none"}-${range}`}
        />
      )}

      {/* Secondary readings, as a strip rather than a separate panel — four
          scalars don't earn a card, and the rail is needed for the wallet. */}
      <dl className="grid grid-cols-2 divide-x divide-y divide-line-subtle border-t border-line sm:grid-cols-4 sm:divide-y-0">
        <Stat label={`${rangeMeta.label} low`} value={formatPrice(low)} loading={isLoading} />
        <Stat label={`${rangeMeta.label} high`} value={formatPrice(high)} loading={isLoading} />
        <Stat
          label="Market cap"
          value={formatCurrencyCompact(asset?.marketCap)}
          loading={isLoading && !asset}
        />
        <Stat
          label="Volume 24h"
          value={formatCurrencyCompact(asset?.volume24h)}
          loading={isLoading && !asset}
        />
      </dl>
    </section>
  );
}

function Stat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="px-4 py-2 sm:px-5">
      <dt>
        <StatLabel>{label}</StatLabel>
      </dt>
      {loading ? (
        <Skeleton className="mt-1 h-3 w-16" />
      ) : (
        <dd className="mt-0.5 text-xs font-medium text-ink nums-tight">{value}</dd>
      )}
    </div>
  );
}


function ChartPlaceholder() {
  return (
    <div
      style={{ height: CHART_HEIGHT }}
      className="flex items-end gap-1 px-3 pb-6 pt-4"
      aria-hidden="true"
    >
      {[36, 49, 42, 57, 52, 65, 60, 72, 66, 78, 73, 83, 77, 87, 82, 91, 86, 94, 90, 97].map(
        (h, index) => (
          <div
            key={index}
            className="flex-1 animate-pulse rounded-t-sm bg-surface-subtle"
            style={{ height: `${h}%`, animationDelay: `${index * 28}ms` }}
          />
        ),
      )}
    </div>
  );
}
