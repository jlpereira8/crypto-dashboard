import { useMemo, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { cn } from "../lib/cn";
import { formatInteger, formatPercentPlain, formatRelativeTime, formatTimestamp } from "../lib/format";
import { fadeUp, staggerContainer, transition } from "../lib/motion";
import { useHealthCheck, type CheckState, type ServiceCheck } from "../lib/useHealthCheck";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  CardTitle,
  ChartIcon,
  EmptyState,
  PageHeader,
  SegmentedControl,
  Skeleton,
  StatLabel,
} from "../components/ui";

const CHART_HEIGHT = 200;

/** The latency chart plots milliseconds, so it must not inherit price formatting. */
const formatMs = (value: number) => `${formatInteger(Math.round(value))} ms`;

const PriceChart = dynamic(
  () => import("../components/charts/PriceChart").then((m) => m.PriceChart),
  { ssr: false, loading: () => <div style={{ height: CHART_HEIGHT }} /> },
);

const INTERVALS = [
  { value: "15", label: "15s", description: "every 15 seconds" },
  { value: "30", label: "30s", description: "every 30 seconds" },
  { value: "60", label: "60s", description: "every minute" },
  { value: "0", label: "Off", description: "manual only" },
] as const;

const STATE_COPY: Record<CheckState, { label: string; tone: "positive" | "negative" | "neutral" }> = {
  operational: { label: "Operational", tone: "positive" },
  degraded: { label: "Degraded", tone: "negative" },
  down: { label: "Not responding", tone: "negative" },
  checking: { label: "Checking", tone: "neutral" },
};

const OVERALL_COPY: Record<CheckState, string> = {
  operational: "All systems operational",
  degraded: "Partially degraded performance",
  down: "Service disruption",
  checking: "Running checks…",
};

/**
 * Service status.
 *
 * Every figure on this page is measured in your browser, right now: the checks
 * fetch the real endpoints and time the round trip. That has two consequences
 * worth stating plainly on the page itself — the numbers describe *your* path to
 * the service rather than a global view, and the only history that exists is the
 * samples taken since you opened it.
 */
export default function StatusPage() {
  const [intervalValue, setIntervalValue] = useState<(typeof INTERVALS)[number]["value"]>("30");
  const health = useHealthCheck(Number(intervalValue) * 1000);

  const overall = STATE_COPY[health.overall];

  const latencyPoints = useMemo(
    () => health.samples.map((sample) => ({ x: sample.x, y: sample.y })),
    [health.samples],
  );

  const latencyTrend = useMemo(() => {
    if (latencyPoints.length < 2) return "flat" as const;
    const first = latencyPoints[0].y;
    const last = latencyPoints[latencyPoints.length - 1].y;
    if (last === first) return "flat" as const;
    // Lower latency is better, so a falling line is the positive direction.
    return last < first ? ("up" as const) : ("down" as const);
  }, [latencyPoints]);

  return (
    <>
      <Head>
        <title>Status — CryptoBay</title>
        <meta
          name="description"
          content="Live availability and response times for the services behind CryptoBay, measured from your browser."
        />
      </Head>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} transition={transition.base}>
          <PageHeader
            eyebrow="Status"
            title={OVERALL_COPY[health.overall]}
            description="These checks run in your browser against the live endpoints. They measure your own path to the service, so a slow result here can mean the service, your network, or anything between."
            actions={
              <>
                <SegmentedControl
                  label="Auto-refresh interval"
                  value={intervalValue}
                  onChange={setIntervalValue}
                  options={INTERVALS.map((entry) => ({
                    value: entry.value,
                    label: entry.label,
                    description: entry.description,
                  }))}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  loading={health.isChecking}
                  onClick={health.refresh}
                >
                  Run checks
                </Button>
              </>
            }
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-2">
                <StatusDot state={health.overall} />
                <Badge tone={overall.tone}>{overall.label}</Badge>
              </span>
              <span
                aria-live="polite"
                className="text-micro uppercase text-ink-muted nums-tabular"
              >
                {health.lastCheckedAt
                  ? `Last checked ${formatRelativeTime(health.lastCheckedAt)}`
                  : "First check running"}
              </span>
              {Number(intervalValue) > 0 && (
                <span className="text-micro uppercase text-ink-muted">
                  Auto-refreshing {INTERVALS.find((i) => i.value === intervalValue)?.description}
                </span>
              )}
            </div>
          </PageHeader>
        </motion.div>

        {/* ── Session metrics ──────────────────────────────────────────────── */}
        <motion.section
          variants={fadeUp}
          transition={transition.base}
          aria-label="Session metrics"
          className="grid grid-cols-2 divide-x divide-y divide-line-subtle border-b border-line bg-surface lg:grid-cols-4 lg:divide-y-0"
        >
          <Metric label="Response time" hint="Mean of this round">
            {health.averageLatencyMs === null ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {formatInteger(health.averageLatencyMs)}
                <span className="ml-1 text-sm font-medium text-ink-muted">ms</span>
              </p>
            )}
          </Metric>

          <Metric label="Clean rounds" hint="This session only">
            {health.sessionUptimePct === null ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {formatPercentPlain(health.sessionUptimePct)}
              </p>
            )}
          </Metric>

          <Metric label="Checks run" hint={`${health.checks.length} endpoints per round`}>
            <p className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {formatInteger(health.roundsRun * health.checks.length)}
            </p>
          </Metric>

          <Metric label="Endpoints" hint="Monitored on this page">
            <p className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {formatInteger(health.checks.length)}
            </p>
          </Metric>
        </motion.section>

        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 xl:border-r xl:border-line">
            {/* ── Components ─────────────────────────────────────────────── */}
            <motion.section
              variants={fadeUp}
              transition={transition.base}
              aria-label="Component status"
              className="border-b border-line bg-surface"
            >
              <div className="px-4 pb-2 pt-4 sm:px-6">
                <h3 className="text-sm font-semibold tracking-tight text-ink">Components</h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  One probe per service the app depends on.
                </p>
              </div>

              <ul className="divide-y divide-line-subtle">
                {health.checks.map((check) => (
                  <li key={check.id}>
                    <ComponentRow check={check} />
                  </li>
                ))}
              </ul>
            </motion.section>

            {/* ── Latency, this session ──────────────────────────────────── */}
            <motion.section
              variants={fadeUp}
              transition={transition.base}
              aria-label="Response time history"
              className="border-b border-line bg-surface"
            >
              <div className="flex flex-wrap items-end justify-between gap-2 px-4 pb-2 pt-4 sm:px-6">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-ink">Response time</h3>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Mean latency per round, since you opened this page.
                  </p>
                </div>
                <span className="text-micro uppercase text-ink-muted nums-tabular">
                  {formatInteger(latencyPoints.length)} sample
                  {latencyPoints.length === 1 ? "" : "s"}
                </span>
              </div>

              {latencyPoints.length < 2 ? (
                <EmptyState
                  icon={<ChartIcon />}
                  title="Collecting samples"
                  description={
                    Number(intervalValue) > 0
                      ? "The chart appears once two rounds have completed. Each round adds one point."
                      : "Auto-refresh is off. Run checks again to add a second point."
                  }
                />
              ) : (
                <PriceChart
                  points={latencyPoints}
                  direction={latencyTrend}
                  seriesName="Mean response time in milliseconds"
                  height={CHART_HEIGHT}
                  animationKey="latency"
                  valueFormat={formatMs}
                  axisFormat={formatMs}
                />
              )}
            </motion.section>
          </div>

          {/* ── Rail: history and maintenance ─────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            transition={transition.base}
            className="space-y-3 border-b border-line bg-canvas p-3"
          >
            <Callout tone="info" title="Why there is no uptime history">
              This demo stores no telemetry — no database, no logging service, no scheduled
              probes. A 90-day uptime figure would have to be invented, so the page reports only
              what it can actually measure: the checks above, taken now.
            </Callout>

            <Card padding="none" className="overflow-hidden">
              <CardHeader bleed>
                <CardTitle as="h3">Incident history</CardTitle>
              </CardHeader>
              <EmptyState
                size="sm"
                title="No incidents recorded"
                description="Incidents would be written by a monitoring backend. This app has none, so the log stays empty rather than showing fabricated entries."
              />
            </Card>

            <Card padding="none" className="overflow-hidden">
              <CardHeader bleed>
                <CardTitle as="h3">Scheduled maintenance</CardTitle>
              </CardHeader>
              <EmptyState
                size="sm"
                title="Nothing scheduled"
                description="There is no deployment window to announce — this is a static front end with no server-side components to take offline."
              />
            </Card>

            <Card>
              <StatLabel>Thresholds</StatLabel>
              <dl className="mt-2 space-y-1.5 text-xs">
                <Threshold label="Operational" value="Responds under 1,500 ms" />
                <Threshold label="Degraded" value="Responds slower, or rate-limited" />
                <Threshold label="Not responding" value="Error status, or no reply in 8 s" />
              </dl>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}

function Metric({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3.5 sm:px-6">
      <StatLabel>{label}</StatLabel>
      <div className="mt-0.5">{children}</div>
      <p className="mt-0.5 text-micro uppercase text-ink-muted">{hint}</p>
    </div>
  );
}

function ComponentRow({ check }: { check: ServiceCheck }) {
  const copy = STATE_COPY[check.state];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:px-6">
      <StatusDot state={check.state} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{check.label}</p>
        <p className="truncate text-xs text-ink-muted">{check.description}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {check.latencyMs !== null && (
          <span className="text-xs font-medium text-ink-secondary nums-tabular">
            {formatInteger(check.latencyMs)} ms
          </span>
        )}
        {check.detail && (
          <span className="text-micro uppercase text-negative">{check.detail}</span>
        )}
        <Badge tone={copy.tone}>{copy.label}</Badge>
      </div>

      {check.checkedAt && (
        <p className="w-full text-micro uppercase text-ink-muted nums-tabular">
          Checked {formatTimestamp(check.checkedAt)}
          {check.httpStatus !== null && ` · HTTP ${check.httpStatus}`}
        </p>
      )}
    </div>
  );
}

/**
 * State indicator.
 *
 * The pulse marks a check in flight, which is the one thing on this page that is
 * genuinely live — but it never animates alone: a Badge beside it always names the
 * state in words.
 */
function StatusDot({ state }: { state: CheckState }) {
  return (
    <span aria-hidden="true" className="relative grid h-2.5 w-2.5 shrink-0 place-items-center">
      {state === "checking" && (
        <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-ink-muted opacity-60" />
      )}
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          state === "operational" && "bg-positive",
          state === "degraded" && "bg-negative",
          state === "down" && "bg-negative",
          state === "checking" && "bg-ink-muted",
        )}
      />
    </span>
  );
}

function Threshold({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink-secondary">{value}</dd>
    </div>
  );
}
