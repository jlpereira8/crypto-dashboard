import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Live service checks.
 *
 * This probes the real endpoints from the browser and reports what it measures.
 * Nothing here is simulated — which also means nothing here is *history*: the app
 * keeps no server-side telemetry, so the only record is the samples taken since
 * this page was opened. A long-run uptime figure would have to be invented, so
 * the page says it has none instead.
 */

const API_BASE = "https://api.coinpaprika.com/v1";

/** Slower than this and the check is reported as degraded rather than healthy. */
const DEGRADED_MS = 1_500;
const TIMEOUT_MS = 8_000;
/** Samples retained in memory for the latency chart. */
const MAX_SAMPLES = 40;

export type CheckState = "operational" | "degraded" | "down" | "checking";

export interface ServiceCheck {
  id: string;
  label: string;
  description: string;
  path: string;
  state: CheckState;
  /** Round-trip time in ms, or null if the probe failed. */
  latencyMs: number | null;
  httpStatus: number | null;
  checkedAt: number | null;
  detail: string | null;
}

export interface LatencySample {
  x: number;
  y: number;
}

interface ProbeTarget {
  id: string;
  label: string;
  description: string;
  path: string;
}

/** Deliberately the smallest useful response from each endpoint the app relies on. */
const TARGETS: readonly ProbeTarget[] = [
  {
    id: "tickers",
    label: "Market data",
    description: "Asset list, prices and 24-hour changes",
    path: "/tickers?quotes=USD&limit=1",
  },
  {
    id: "global",
    label: "Global statistics",
    description: "Total market cap, volume and dominance",
    path: "/global",
  },
  {
    id: "historical",
    label: "Price history",
    description: "Time series behind every chart",
    path: "/tickers/btc-bitcoin/historical?start=__START__&interval=1d",
  },
  {
    id: "logos",
    label: "Asset logos",
    description: "Static image CDN",
    path: "__LOGO__",
  },
];

function resolvePath(path: string): string {
  if (path === "__LOGO__") {
    return "https://static.coinpaprika.com/coin/btc-bitcoin/logo.png";
  }
  const start = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
  return `${API_BASE}${path.replace("__START__", start)}`;
}

function initial(target: ProbeTarget): ServiceCheck {
  return {
    ...target,
    state: "checking",
    latencyMs: null,
    httpStatus: null,
    checkedAt: null,
    detail: null,
  };
}

async function probe(target: ProbeTarget): Promise<ServiceCheck> {
  const url = resolvePath(target.path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // Bypass the HTTP cache so the measurement reflects the service, not the disk.
      cache: "no-store",
    });
    const latencyMs = Math.round(performance.now() - started);

    if (!response.ok) {
      return {
        ...target,
        state: response.status === 429 ? "degraded" : "down",
        latencyMs,
        httpStatus: response.status,
        checkedAt: Date.now(),
        detail: response.status === 429 ? "Rate limited" : `HTTP ${response.status}`,
      };
    }

    return {
      ...target,
      state: latencyMs > DEGRADED_MS ? "degraded" : "operational",
      latencyMs,
      httpStatus: response.status,
      checkedAt: Date.now(),
      detail: latencyMs > DEGRADED_MS ? "Slow response" : null,
    };
  } catch {
    return {
      ...target,
      state: "down",
      latencyMs: null,
      httpStatus: null,
      checkedAt: Date.now(),
      // A browser cannot distinguish a network failure from a blocked request,
      // so don't claim to know which it was.
      detail: "No response",
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface HealthSnapshot {
  checks: ServiceCheck[];
  overall: CheckState;
  /** Mean latency of the successful checks in the latest round. */
  averageLatencyMs: number | null;
  /** Successful rounds ÷ total rounds, this session only. */
  sessionUptimePct: number | null;
  roundsRun: number;
  /** Per-round mean latency, for the chart. */
  samples: LatencySample[];
  isChecking: boolean;
  lastCheckedAt: number | null;
  refresh: () => void;
}

/** Worst state wins: one endpoint down means the system is not fully operational. */
function combine(checks: ServiceCheck[]): CheckState {
  if (checks.some((check) => check.state === "checking")) return "checking";
  if (checks.some((check) => check.state === "down")) return "down";
  if (checks.some((check) => check.state === "degraded")) return "degraded";
  return "operational";
}

export function useHealthCheck(intervalMs = 30_000): HealthSnapshot {
  const [checks, setChecks] = useState<ServiceCheck[]>(() => TARGETS.map(initial));
  const [samples, setSamples] = useState<LatencySample[]>([]);
  const [rounds, setRounds] = useState({ total: 0, clean: 0 });
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  // Guards against a late round from a unmounted page writing state.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setIsChecking(true);
    const results = await Promise.all(TARGETS.map(probe));
    if (!alive.current) return;

    setChecks(results);
    setIsChecking(false);
    setLastCheckedAt(Date.now());

    const successes = results.filter((check) => check.latencyMs !== null);
    if (successes.length > 0) {
      const mean = Math.round(
        successes.reduce((sum, check) => sum + (check.latencyMs ?? 0), 0) / successes.length,
      );
      setSamples((current) => [...current, { x: Date.now(), y: mean }].slice(-MAX_SAMPLES));
    }

    setRounds((current) => ({
      total: current.total + 1,
      clean: current.clean + (results.every((check) => check.state === "operational") ? 1 : 0),
    }));
  }, []);

  useEffect(() => {
    void run();
    if (intervalMs <= 0) return;
    const id = setInterval(() => void run(), intervalMs);
    return () => clearInterval(id);
  }, [run, intervalMs]);

  const successes = checks.filter((check) => check.latencyMs !== null);
  const averageLatencyMs =
    successes.length > 0
      ? Math.round(successes.reduce((sum, check) => sum + (check.latencyMs ?? 0), 0) / successes.length)
      : null;

  return {
    checks,
    overall: combine(checks),
    averageLatencyMs,
    sessionUptimePct: rounds.total > 0 ? (rounds.clean / rounds.total) * 100 : null,
    roundsRun: rounds.total,
    samples,
    isChecking,
    lastCheckedAt,
    refresh: () => void run(),
  };
}
