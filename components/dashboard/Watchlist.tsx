import React, { useId, useMemo } from "react";
import Link from "next/link";
import { cn } from "../../lib/cn";
import { formatPrice } from "../../lib/format";
import type { Asset } from "../../lib/market-api";
import { useWatchlist } from "../../lib/useWatchlist";
import { Badge, Button, CardTitle, DeltaPill, EmptyState, Skeleton } from "../ui";
import { CoinMark } from "./CoinMark";

const MAX_ROWS = 5;

export interface WatchlistProps {
  assets: Asset[] | undefined;
  selectedId: string | undefined;
  onSelect: (assetId: string) => void;
  isLoading: boolean;
}

/**
 * Starred assets.
 *
 * A region, matching the chart and the market table it sits beneath — flush,
 * hairline-bounded, no radius or shadow. Cards belong to the right rail.
 *
 * Reads the same localStorage-backed store the Markets page writes, so starring
 * something there surfaces it here — which is also what makes the feature
 * discoverable from the dashboard instead of hiding on another route.
 *
 * Order follows the order they were starred, not market cap: the point of a
 * watchlist is that the user chose it.
 */
export function Watchlist({ assets, selectedId, onSelect, isLoading }: WatchlistProps) {
  const headingId = `${useId()}-watchlist`;
  const watchlist = useWatchlist();

  const rows = useMemo(() => {
    if (!assets?.length || watchlist.ids.length === 0) return [];
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    // Starred ids may name assets outside the top 50; skip those rather than
    // rendering a row with no price.
    return watchlist.ids
      .map((id) => byId.get(id))
      .filter((asset): asset is Asset => Boolean(asset))
      .slice(0, MAX_ROWS);
  }, [assets, watchlist.ids]);

  const hidden = Math.max(0, watchlist.ids.length - rows.length);

  return (
    <section aria-labelledby={headingId} className="flex flex-col bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5 sm:px-5">
        <CardTitle id={headingId}>Watchlist</CardTitle>
        <div className="flex items-center gap-2">
          {watchlist.count > 0 && <Badge size="sm">{watchlist.count}</Badge>}
          <Link
            href="/markets"
            className="focus-ring rounded px-1 py-0.5 text-micro font-medium uppercase text-accent-text transition-colors duration-fast hover:bg-accent-soft"
          >
            Edit
          </Link>
        </div>
      </div>

      {isLoading ? (
        <ul className="flex-1 divide-y divide-line-subtle">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="flex items-center gap-2.5 px-4 py-2 sm:px-5" aria-hidden="true">
              <Skeleton shape="circle" className="h-5 w-5" />
              <Skeleton className="h-2.5 flex-1" />
              <Skeleton className="h-2.5 w-12" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <EmptyState
          size="sm"
          className="flex-1"
          title="Your watchlist is empty"
          description="Star assets on the Markets page to track them here — or start from the default set."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" variant="primary" onClick={watchlist.restoreDefaults}>
                Restore defaults
              </Button>
              <Link
                href="/markets"
                className="focus-ring inline-flex h-7 items-center rounded px-2.5 text-xs font-medium text-accent-text transition-colors duration-fast hover:bg-accent-soft"
              >
                Browse markets
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <ul className="flex-1 divide-y divide-line-subtle">
            {rows.map((asset) => {
              const selected = asset.id === selectedId;
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(asset.id)}
                    className={cn(
                      "focus-ring-inset group relative flex w-full items-center gap-2.5 px-4 py-2 text-left sm:px-5",
                      "transition-colors duration-fast",
                      selected ? "bg-accent-soft" : "hover:bg-surface-hover",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-y-0 left-0 w-[2px] origin-center bg-accent",
                        "transition-transform duration-fast ease-out",
                        selected ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100",
                      )}
                    />
                    <CoinMark src={asset.logoUrl} symbol={asset.symbol} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-ink">
                        {asset.name}
                      </span>
                      <span className="block text-micro uppercase text-ink-muted nums-tight">
                        {formatPrice(asset.price)}
                      </span>
                    </span>
                    <DeltaPill value={asset.change24h} size="sm" bare className="shrink-0" />
                    <span className="sr-only">
                      {selected ? " — shown in chart" : " — show in chart"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {hidden > 0 && (
            <p className="border-t border-line px-4 py-2 text-micro uppercase text-ink-muted sm:px-5">
              {hidden} more starred — see Markets
            </p>
          )}
        </>
      )}
    </section>
  );
}
