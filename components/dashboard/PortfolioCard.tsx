import React, { useMemo } from "react";
import { formatCurrencyCompact, formatPercentPlain, formatPrice } from "../../lib/format";
import { derivePortfolio } from "../../lib/portfolio";
import { DonutChart, describeAllocation } from "../charts/DonutChart";
import { cn } from "../../lib/cn";
import { Badge, Card, CardHeader, CardTitle, StatLabel, Tooltip } from "../ui";

/** Matches Button's primary/sm treatment, on an anchor. */
const SWAP_LINK_CLASS = cn(
  "focus-ring inline-flex h-7 select-none items-center justify-center rounded px-2.5",
  "bg-accent text-xs font-medium text-accent-ink shadow-xs",
  "transition-[background-color,transform] duration-fast ease-out",
  "hover:bg-accent-hover active:scale-[0.985]",
);

export interface PortfolioCardProps {
  /** Anchor of the swap panel. Rendered as a link, so it needs no JS. */
  swapHref?: string;
}

/**
 * The wallet's centrepiece: total value, allocation ring, and holdings.
 *
 * Replaces v1's "Balances" list, which was two rows and a total with nothing to
 * make it feel like a wallet. The ring gives the card a glanceable identity, and
 * the rows carry the numbers.
 *
 * The ring itself is `aria-hidden`; the rows below state every label, share and
 * value as text, so nothing here is reachable only by reading a chart. Each row's
 * dot matches the segment representing it — holdings past the ring's three slots
 * share the neutral "Other" swatch.
 */
export function PortfolioCard({ swapHref }: PortfolioCardProps) {
  const { total, holdings, slices } = useMemo(() => derivePortfolio(), []);

  return (
    <Card padding="none">
      <CardHeader bleed>
        <CardTitle>Portfolio</CardTitle>
        <Tooltip content="Fixture holdings — this demo has no wallet connection">
          <Badge tabIndex={0} className="cursor-help">
            Sample
          </Badge>
        </Tooltip>
      </CardHeader>

      {/* Total + ring */}
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <StatLabel>Total value</StatLabel>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">
            {formatPrice(total)}
          </p>
          <p className="mt-0.5 text-micro uppercase text-ink-muted">
            {holdings.length} assets
          </p>
          {swapHref && (
            <a href={swapHref} className={cn(SWAP_LINK_CLASS, "mt-2.5")}>
              Swap assets
            </a>
          )}
        </div>

        <DonutChart slices={slices} size={92} className="shrink-0" />
      </div>

      {/* Holdings — also the ring's legend */}
      <ul
        aria-label={`Allocation: ${describeAllocation(slices)}`}
        className="divide-y divide-line-subtle border-t border-line"
      >
        {holdings.map((holding) => (
          <li key={holding.id} className="flex items-center gap-2.5 px-4 py-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: `var(${holding.colorVar})` }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-ink">{holding.name}</span>
              <span className="block text-micro uppercase text-ink-muted nums-tabular">
                {holding.units.toLocaleString("en-US", { maximumFractionDigits: 4 })}{" "}
                {holding.symbol}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-xs font-medium text-ink nums-tight">
                {formatCurrencyCompact(holding.usdValue)}
              </span>
              <span className="block text-micro text-ink-muted nums-tabular">
                {formatPercentPlain(holding.share)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
