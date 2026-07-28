import React from "react";
import { cn } from "../../lib/cn";
import { formatCurrencyCompact, formatInteger, formatPercentPlain } from "../../lib/format";
import type { GlobalMarket } from "../../lib/market-api";
import { AnimatedNumber, Button, DeltaPill, Skeleton, Tooltip } from "../ui";

export interface MarketTickerProps {
  global: GlobalMarket | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  onRefresh: () => void;
}

/**
 * The global market strip.
 *
 * v1 spent a ~190px panel and a 34px display figure on these four numbers, at the
 * very top of the page, which pushed the chart below the fold. They are context,
 * not the subject — so they're now a 40px ticker rail: label and value on one
 * line, vertical hairlines between, exactly the strip every exchange runs above
 * its workspace.
 *
 * Scrolls horizontally on narrow screens rather than wrapping, because a ticker
 * that reflows into three rows stops being a ticker.
 */
export function MarketTicker({
  global,
  isLoading,
  isRefreshing,
  isError,
  onRefresh,
}: MarketTickerProps) {
  return (
    <section
      aria-label="Global market statistics"
      className={cn(
        "flex items-stretch border-b border-line bg-surface",
        isRefreshing && !isLoading && "opacity-60 transition-opacity duration-base",
      )}
    >
      <div className="scrollbar-slim flex min-w-0 flex-1 items-stretch divide-x divide-line-subtle overflow-x-auto">
        <Cell
          label="Market cap"
          value={global?.marketCap}
          format={formatCurrencyCompact}
          delta={global?.marketCapChange24h ?? null}
          loading={isLoading}
        />
        <Cell
          label="24h volume"
          value={global?.volume24h}
          format={formatCurrencyCompact}
          loading={isLoading}
        />
        <Cell
          label="BTC dominance"
          value={global?.btcDominance}
          format={formatPercentPlain}
          loading={isLoading}
        />
        <Cell
          label="Assets"
          value={global?.assetCount}
          format={formatInteger}
          loading={isLoading}
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 border-l border-line px-2">
        {isError && (
          <span className="hidden text-micro uppercase text-negative sm:inline">Stale</span>
        )}
        <Tooltip content="Refresh market data">
          <Button
            variant="ghost"
            iconOnly
            size="sm"
            aria-label="Refresh market data"
            loading={isRefreshing}
            onClick={onRefresh}
          >
            <RefreshIcon />
          </Button>
        </Tooltip>
      </div>
    </section>
  );
}

/**
 * One reading. Label and value share a baseline rather than stacking, which is
 * what keeps the whole strip to a single 40px band.
 */
function Cell({
  label,
  value,
  format,
  delta,
  loading,
}: {
  label: string;
  value: number | null | undefined;
  format: (value: number) => string;
  delta?: number | null;
  loading: boolean;
}) {
  return (
    <div className="flex shrink-0 items-baseline gap-2 px-3 py-2.5 sm:px-4">
      <span className="text-micro font-medium uppercase text-ink-muted">{label}</span>
      {loading ? (
        <Skeleton className="h-3 w-16" />
      ) : (
        <>
          <AnimatedNumber
            value={value}
            format={format}
            className="text-xs font-semibold text-ink nums-tabular"
          />
          {delta !== undefined && <DeltaPill value={delta} size="sm" bare />}
        </>
      )}
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path
        d="M13.5 8a5.5 5.5 0 1 1-1.9-4.17M13.5 2.5V6H10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
