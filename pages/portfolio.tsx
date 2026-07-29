import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { cn } from "../lib/cn";
import {
  formatCurrencyCompact,
  formatPercent,
  formatPercentPlain,
  formatPrice,
  formatSignedPrice,
  formatTimestamp,
} from "../lib/format";
import { RANGES, getRange, type RangeId } from "../lib/market-api";
import { fadeUp, staggerContainer, transition } from "../lib/motion";
import {
  SAMPLE_HOLDINGS,
  SAMPLE_TRANSACTIONS,
  type ValuedHolding,
} from "../lib/portfolio";
import { seriesChangePct } from "../lib/market-view";
import { usePortfolioHistory, usePortfolioValuation } from "../lib/usePortfolio";
import { DonutChart, describeAllocation } from "../components/charts/DonutChart";
import { CoinMark } from "../components/dashboard/CoinMark";
import {
  AlertIcon,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  ChartIcon,
  DeltaPill,
  EmptyState,
  PageHeader,
  SegmentedControl,
  Skeleton,
  StatLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableScroll,
  Tooltip,
} from "../components/ui";

const CHART_HEIGHT = 300;

const PriceChart = dynamic(() => import("../components/charts/PriceChart").then((m) => m.PriceChart), {
  ssr: false,
  loading: () => <ChartPlaceholder />,
});

/**
 * Portfolio.
 *
 * Units and cost basis are fixtures — there is no wallet connection — but every
 * figure on the page is computed: value from live prices, P/L against cost basis,
 * today's move from each asset's 24h change, and the performance curve from the
 * holdings' real price histories.
 *
 * That costs one history request per holding, the only fan-out in the app. They
 * share query keys with the dashboard chart, so any range already viewed there is
 * served from cache.
 */
export default function PortfolioPage() {
  const [range, setRange] = useState<RangeId>("30D");

  const { valuation, isLoading, isError, isRefreshing, refetch } = usePortfolioValuation();
  const history = usePortfolioHistory(SAMPLE_HOLDINGS, range);

  const rangeMeta = getRange(range);
  const rangeChangePct = useMemo(() => seriesChangePct(history.points), [history.points]);
  const direction = rangeChangePct === null || rangeChangePct === 0 ? "flat" : rangeChangePct > 0 ? "up" : "down";

  const transactions = useMemo(
    () => [...SAMPLE_TRANSACTIONS].sort((a, b) => b.timestamp - a.timestamp),
    [],
  );

  const isEmpty = !isLoading && valuation.holdings.length === 0;

  return (
    <>
      <Head>
        <title>Portfolio — CryptoBay</title>
        <meta name="description" content="Holdings, allocation, performance and transaction history." />
      </Head>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} transition={transition.base}>
          <PageHeader
            title="Portfolio"
            description="A sample set of holdings, valued against live market prices. Cost basis and unit counts are fixtures; every total, gain and percentage below is calculated from them."
            actions={
              <>
                <Tooltip content="Fixture holdings valued at live prices — no wallet is connected">
                  <Badge tabIndex={0} tone="accent" className="cursor-help">
                    Sample data
                  </Badge>
                </Tooltip>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={isRefreshing}
                  onClick={() => void refetch()}
                >
                  Refresh
                </Button>
              </>
            }
          />
        </motion.div>

        {isEmpty ? (
          <motion.div variants={fadeUp} transition={transition.base}>
            <EmptyState
              icon={<ChartIcon />}
              title="No holdings yet"
              description="Once you hold an asset it will appear here with its allocation, performance and cost basis."
              action={
                <Link
                  href="/markets"
                  className="focus-ring inline-flex h-8 items-center rounded bg-accent px-3 text-xs font-medium text-accent-ink"
                >
                  Browse markets
                </Link>
              }
            />
          </motion.div>
        ) : (
          <>
            {/* ── Headline figures ────────────────────────────────────────── */}
            <motion.section
              variants={fadeUp}
              transition={transition.base}
              aria-label="Portfolio summary"
              className={cn(
                "grid grid-cols-2 divide-x divide-y divide-line-subtle border-b border-line bg-surface",
                "lg:grid-cols-4 lg:divide-y-0",
                isRefreshing && !isLoading && "opacity-[0.55] transition-opacity duration-base",
              )}
            >
              <Metric label="Total value" loading={isLoading}>
                <p className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  {formatPrice(valuation.totalValueUsd)}
                </p>
                <p className="mt-0.5 text-micro uppercase text-ink-muted">
                  Cost basis {formatCurrencyCompact(valuation.totalCostUsd)}
                </p>
              </Metric>

              <Metric label="Today" loading={isLoading}>
                <p
                  className={cn(
                    "text-2xl font-semibold tracking-tight sm:text-3xl",
                    signInk(valuation.todayPnlUsd),
                  )}
                >
                  {formatSignedPrice(valuation.todayPnlUsd)}
                </p>
                <p className="mt-0.5">
                  <DeltaPill value={valuation.todayPnlPct} period="24 hours" size="sm" bare />
                </p>
              </Metric>

              <Metric label="Total return" loading={isLoading}>
                <p
                  className={cn(
                    "text-2xl font-semibold tracking-tight sm:text-3xl",
                    signInk(valuation.totalPnlUsd),
                  )}
                >
                  {formatSignedPrice(valuation.totalPnlUsd)}
                </p>
                <p className="mt-0.5">
                  <DeltaPill value={valuation.totalPnlPct} period="since purchase" size="sm" bare />
                </p>
              </Metric>

              <Metric label="Movers · 24h" loading={isLoading}>
                <MoverLine label="Best" holding={valuation.best} />
                <MoverLine label="Worst" holding={valuation.worst} />
              </Metric>
            </motion.section>

            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_21rem]">
              <div className="min-w-0 xl:border-r xl:border-line">
                {/* ── Performance ──────────────────────────────────────────── */}
                <motion.section
                  variants={fadeUp}
                  transition={transition.base}
                  aria-label="Portfolio performance chart"
                  className="border-b border-line bg-surface"
                >
                  <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2 px-4 pb-2 pt-4 sm:px-6">
                    <div className="min-w-0">
                      <StatLabel>Performance</StatLabel>
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
                        <span className="text-xl font-semibold tracking-tight text-ink">
                          {formatPrice(history.points.at(-1)?.y ?? null)}
                        </span>
                        <DeltaPill value={rangeChangePct} period={rangeMeta.description} />
                      </div>
                    </div>
                    <SegmentedControl
                      label="Performance range"
                      value={range}
                      onChange={setRange}
                      options={RANGES.map((r) => ({
                        value: r.id,
                        label: r.label,
                        description: r.description,
                      }))}
                    />
                  </div>

                  {history.isError && history.points.length === 0 ? (
                    <div style={{ height: CHART_HEIGHT }} className="grid place-items-center">
                      <EmptyState
                        tone="error"
                        icon={<AlertIcon />}
                        title="Performance history unavailable"
                        description="The price history requests didn't go through. This is usually a brief rate limit."
                        action={
                          <Button size="sm" variant="secondary" onClick={() => void refetch()}>
                            Try again
                          </Button>
                        }
                      />
                    </div>
                  ) : history.isLoading ? (
                    <ChartPlaceholder />
                  ) : history.points.length === 0 ? (
                    <div style={{ height: CHART_HEIGHT }} className="grid place-items-center">
                      <EmptyState
                        icon={<ChartIcon />}
                        title="No history for this range"
                        description={`The provider has no price history for these holdings over the ${rangeMeta.description}.`}
                      />
                    </div>
                  ) : (
                    <PriceChart
                      points={history.points}
                      direction={direction}
                      seriesName="Portfolio value"
                      height={CHART_HEIGHT}
                      animationKey={range}
                    />
                  )}

                  {history.missing.length > 0 && (
                    <p className="border-t border-line px-4 py-2 text-micro uppercase text-ink-muted sm:px-6">
                      Curve excludes {history.missing.join(", ")} — history unavailable
                    </p>
                  )}
                </motion.section>

                {/* ── Holdings ─────────────────────────────────────────────── */}
                <motion.section
                  variants={fadeUp}
                  transition={transition.base}
                  aria-label="Holdings"
                  className="border-b border-line bg-surface"
                >
                  <div className="px-4 pb-2 pt-4 sm:px-6">
                    <h3 className="text-sm font-semibold tracking-tight text-ink">Holdings</h3>
                  </div>

                  <TableScroll className="hidden md:block">
                    <Table>
                      <caption className="sr-only">
                        Holdings with units, average cost, current value, allocation share and
                        unrealised return.
                      </caption>
                      <TableHead>
                        <tr>
                          <TableHeaderCell>Asset</TableHeaderCell>
                          <TableHeaderCell align="right">Units</TableHeaderCell>
                          <TableHeaderCell align="right">Avg cost</TableHeaderCell>
                          <TableHeaderCell align="right">Price</TableHeaderCell>
                          <TableHeaderCell align="right">Value</TableHeaderCell>
                          <TableHeaderCell align="right">Allocation</TableHeaderCell>
                          <TableHeaderCell align="right">Return</TableHeaderCell>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {isLoading
                          ? Array.from({ length: 5 }, (_, index) => (
                              <tr key={index} aria-hidden="true">
                                {Array.from({ length: 7 }, (_, cell) => (
                                  <TableCell key={cell} align={cell > 0 ? "right" : "left"}>
                                    <Skeleton className="ml-auto h-2.5 w-16" />
                                  </TableCell>
                                ))}
                              </tr>
                            ))
                          : valuation.holdings.map((holding) => (
                              <tr
                                key={holding.id}
                                className="transition-colors duration-fast hover:bg-surface-hover"
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span
                                      aria-hidden="true"
                                      className="h-2 w-2 shrink-0 rounded-full"
                                      style={{ backgroundColor: `var(${holding.colorVar})` }}
                                    />
                                    <CoinMark symbol={holding.symbol} />
                                    <span className="truncate text-sm font-medium text-ink">
                                      {holding.name}
                                    </span>
                                    <span className="shrink-0 text-micro font-medium uppercase text-ink-muted">
                                      {holding.symbol}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell align="right" className="text-ink-secondary nums-tabular">
                                  {holding.units.toLocaleString("en-US", {
                                    maximumFractionDigits: 4,
                                  })}
                                </TableCell>
                                <TableCell align="right" className="text-ink-secondary nums-tight">
                                  {formatPrice(
                                    holding.units > 0 ? holding.costBasisUsd / holding.units : null,
                                  )}
                                </TableCell>
                                <TableCell align="right" className="nums-tabular">
                                  {formatPrice(holding.price)}
                                </TableCell>
                                <TableCell align="right" className="font-medium nums-tight">
                                  {formatPrice(holding.valueUsd)}
                                </TableCell>
                                <TableCell align="right" className="text-ink-secondary nums-tabular">
                                  {formatPercentPlain(holding.share)}
                                </TableCell>
                                <TableCell align="right">
                                  <span
                                    className={cn(
                                      "block text-xs font-medium nums-tight",
                                      signInk(holding.pnlUsd),
                                    )}
                                  >
                                    {formatSignedPrice(holding.pnlUsd)}
                                  </span>
                                  <span className="block text-micro text-ink-muted nums-tabular">
                                    {formatPercent(holding.pnlPct)}
                                  </span>
                                </TableCell>
                              </tr>
                            ))}
                      </TableBody>
                    </Table>
                  </TableScroll>

                  {/* Mobile: the same rows as stacked cards. */}
                  <ul className="divide-y divide-line-subtle md:hidden">
                    {(isLoading ? [] : valuation.holdings).map((holding) => (
                      <li key={holding.id} className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: `var(${holding.colorVar})` }}
                          />
                          <CoinMark symbol={holding.symbol} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                            {holding.name}
                          </span>
                          <span className="shrink-0 text-sm font-medium text-ink nums-tight">
                            {formatPrice(holding.valueUsd)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 pl-4 text-micro uppercase text-ink-muted nums-tabular">
                          <span>
                            {holding.units.toLocaleString("en-US", { maximumFractionDigits: 4 })}{" "}
                            {holding.symbol} · {formatPercentPlain(holding.share)}
                          </span>
                          <span className={signInk(holding.pnlUsd)}>
                            {formatSignedPrice(holding.pnlUsd)} ({formatPercent(holding.pnlPct)})
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </motion.section>
              </div>

              {/* ── Rail: allocation + activity ────────────────────────────── */}
              <motion.div
                variants={fadeUp}
                transition={transition.base}
                className="space-y-3 border-b border-line bg-canvas p-3"
              >
                <Card padding="none" className="overflow-hidden">
                  <CardHeader bleed>
                    <CardTitle as="h3">Allocation</CardTitle>
                  </CardHeader>
                  <div className="flex flex-col items-center gap-3 p-4">
                    {isLoading ? (
                      <Skeleton shape="circle" className="h-[120px] w-[120px]" />
                    ) : (
                      <DonutChart slices={valuation.slices} size={120} />
                    )}
                    <ul
                      aria-label={
                        isLoading
                          ? "Loading allocation"
                          : `Allocation: ${describeAllocation(valuation.slices)}`
                      }
                      className="w-full space-y-1.5"
                    >
                      {(isLoading ? [] : valuation.slices).map((slice) => (
                        <li key={slice.id} className="flex items-center gap-2 text-xs">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: `var(${slice.colorVar})` }}
                          />
                          <span className="min-w-0 flex-1 truncate text-ink-secondary">
                            {slice.label}
                          </span>
                          <span className="shrink-0 font-medium text-ink nums-tabular">
                            {formatPercentPlain(slice.share)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>

                <Card padding="none" className="overflow-hidden">
                  <CardHeader bleed>
                    <CardTitle as="h3">Recent activity</CardTitle>
                    <Badge size="sm">{transactions.length}</Badge>
                  </CardHeader>
                  <ol className="divide-y divide-line-subtle">
                    {transactions.map((tx) => (
                      <li key={tx.id} className="flex items-center gap-2.5 px-4 py-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid h-6 w-6 shrink-0 place-items-center rounded-full text-micro font-bold",
                            tx.kind === "buy"
                              ? "bg-positive-soft text-positive"
                              : "bg-negative-soft text-negative",
                          )}
                        >
                          {tx.kind === "buy" ? "↓" : "↑"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-ink">
                            {tx.kind === "buy" ? "Bought" : "Sold"} {tx.symbol}
                          </span>
                          <span className="block text-micro text-ink-muted nums-tabular">
                            {formatTimestamp(tx.timestamp)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-xs font-medium text-ink nums-tabular">
                            {tx.units.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                          </span>
                          <span className="block text-micro text-ink-muted nums-tight">
                            @ {formatPrice(tx.unitPriceUsd)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="border-t border-line px-4 py-2 text-micro uppercase text-ink-muted">
                    These trades produce the holdings above
                  </p>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}

/** Ink colour for a signed figure. Sign and value are always both present. */
function signInk(value: number | null): string {
  if (value === null || value === 0) return "text-ink";
  return value > 0 ? "text-positive" : "text-negative";
}

function Metric({
  label,
  loading,
  children,
}: {
  label: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3.5 sm:px-6">
      <StatLabel>{label}</StatLabel>
      {loading ? <Skeleton className="mt-1.5 h-7 w-24" /> : <div className="mt-0.5">{children}</div>}
    </div>
  );
}

function MoverLine({ label, holding }: { label: string; holding: ValuedHolding | null }) {
  return (
    <p className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-ink-muted">{label}</span>
      {holding ? (
        <span className="flex items-baseline gap-1.5">
          <span className="font-medium text-ink">{holding.symbol}</span>
          <DeltaPill value={holding.change24hPct} size="sm" bare />
        </span>
      ) : (
        <span className="text-ink-muted">—</span>
      )}
    </p>
  );
}

function ChartPlaceholder() {
  return (
    <div
      style={{ height: CHART_HEIGHT }}
      className="flex items-end gap-1 px-3 pb-6 pt-4"
      aria-hidden="true"
    >
      {[40, 52, 47, 60, 55, 68, 63, 74, 70, 80, 76, 86, 81, 90, 85, 94].map((h, index) => (
        <div
          key={index}
          className="flex-1 animate-pulse rounded-t-sm bg-surface-subtle"
          style={{ height: `${h}%`, animationDelay: `${index * 30}ms` }}
        />
      ))}
    </div>
  );
}
