/**
 * Formatting helpers.
 *
 * `Intl.NumberFormat` construction is the expensive part (locale data lookup),
 * not `.format()` — so every formatter is built once at module scope and
 * reused. Building one per render was measurable on the 50-row markets table.
 */

const LOCALE = "en-US";

const usd0 = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usd2 = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usd6 = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const usdCompact = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const percent2 = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const decimal8 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 8 });
const decimal6 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 6 });

const timeShort = new Intl.DateTimeFormat(LOCALE, {
  hour: "numeric",
  minute: "2-digit",
});

const dateShort = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  day: "numeric",
});

const monthShort = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
});

const dateTimeMedium = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const EM_DASH = "—";

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Price, scaled to the magnitude: sub-dollar assets need more decimals than
 * Bitcoin does. Keeps a $0.00000123 token from rendering as "$0.00".
 */
export function formatPrice(value: number | null | undefined): string {
  if (!isNum(value)) return EM_DASH;
  const abs = Math.abs(value);
  if (abs === 0) return usd2.format(0);
  if (abs >= 1000) return usd0.format(value);
  if (abs >= 1) return usd2.format(value);
  if (abs >= 0.01) return usd6.format(value);
  // Below a cent, show the first 2 significant digits wherever they land.
  const places = Math.min(12, Math.ceil(-Math.log10(abs)) + 1);
  return `$${value.toFixed(places)}`;
}

/** Large money in axis/tile form: $2.41T, $84.2B. */
export function formatCurrencyCompact(value: number | null | undefined): string {
  return isNum(value) ? usdCompact.format(value) : EM_DASH;
}

export function formatCompact(value: number | null | undefined): string {
  return isNum(value) ? compact.format(value) : EM_DASH;
}

/** Signed percentage with a fixed 2dp, e.g. "+2.41%" / "-0.88%". */
export function formatPercent(value: number | null | undefined): string {
  if (!isNum(value)) return EM_DASH;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${percent2.format(Math.abs(value))}%`;
}

/** Unsigned percentage — for a share-of-total like BTC dominance. */
export function formatPercentPlain(value: number | null | undefined): string {
  return isNum(value) ? `${percent2.format(value)}%` : EM_DASH;
}

export function formatAmount(value: number | null | undefined, maxDigits = 8): string {
  if (!isNum(value)) return EM_DASH;
  return (maxDigits > 6 ? decimal8 : decimal6).format(value);
}

export function formatInteger(value: number | null | undefined): string {
  return isNum(value) ? value.toLocaleString(LOCALE) : EM_DASH;
}

/** How wide a time axis is, which decides the tick label's granularity. */
export type AxisSpan = "hours" | "days" | "months";

/** Axis tick label: clock inside a day, date across weeks, month across a year. */
export function formatAxisDate(ms: number, span: AxisSpan): string {
  const d = new Date(ms);
  if (span === "hours") return timeShort.format(d);
  return span === "months" ? monthShort.format(d) : dateShort.format(d);
}

/** Relative "updated 2m ago" label for the chart header. */
export function formatRelativeTime(ms: number | null | undefined, now = Date.now()): string {
  if (!isNum(ms)) return EM_DASH;
  const seconds = Math.round((now - ms) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Tooltip timestamp — always unambiguous, both date and time. */
export function formatTimestamp(ms: number): string {
  return dateTimeMedium.format(new Date(ms));
}

/** Axis tick for a money scale: clean, compact, no currency noise below $1k. */
export function formatAxisPrice(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return usdCompact.format(value);
  if (abs >= 1) return `$${value.toFixed(abs >= 100 ? 0 : 2)}`;
  return `$${value.toFixed(3)}`;
}

/**
 * Screen-reader phrasing for a delta. "+2.41%" read aloud becomes "plus two
 * point four one percent" in some engines and "2.41%" in others — spelling out
 * the direction removes the ambiguity.
 */
export function describeDelta(value: number | null | undefined, period: string): string {
  if (!isNum(value)) return `No change data for ${period}`;
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  return `${dir} ${percent2.format(Math.abs(value))} percent over ${period}`;
}
