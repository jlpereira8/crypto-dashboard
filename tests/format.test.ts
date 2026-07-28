import { describe, expect, it } from "vitest";
import {
  describeDelta,
  formatAmount,
  formatCurrencyCompact,
  formatInteger,
  formatPercent,
  formatPrice,
  formatRelativeTime,
} from "../lib/format";

const EM_DASH = "—";

/**
 * The contract that matters most here: a missing value renders as an em dash,
 * never as 0. A zeroed market cap would read as a real datum.
 */
describe("missing values render as an em dash", () => {
  const formatters: [string, (v: number | null | undefined) => string][] = [
    ["formatPrice", formatPrice],
    ["formatCurrencyCompact", formatCurrencyCompact],
    ["formatPercent", formatPercent],
    ["formatAmount", formatAmount],
    ["formatInteger", formatInteger],
    ["formatRelativeTime", formatRelativeTime],
  ];

  for (const [name, format] of formatters) {
    it(`${name} handles null, undefined and NaN`, () => {
      expect(format(null)).toBe(EM_DASH);
      expect(format(undefined)).toBe(EM_DASH);
      expect(format(NaN)).toBe(EM_DASH);
      expect(format(Infinity)).toBe(EM_DASH);
    });
  }

  it("still formats a genuine zero as a value, not a dash", () => {
    expect(formatPrice(0)).toBe("$0.00");
    expect(formatPercent(0)).toBe("0.00%");
    expect(formatInteger(0)).toBe("0");
  });
});

describe("formatPrice", () => {
  it("drops decimals on large values and keeps them on small ones", () => {
    expect(formatPrice(64_000)).toBe("$64,000");
    expect(formatPrice(148.5)).toBe("$148.50");
  });

  it("keeps sub-dollar assets readable instead of rounding to $0.00", () => {
    expect(formatPrice(0.62)).toBe("$0.62");
    expect(formatPrice(0.0000123)).not.toBe("$0.00");
    expect(formatPrice(0.0000123)).toContain("0.0000");
  });
});

describe("formatCurrencyCompact", () => {
  it("compacts large money", () => {
    expect(formatCurrencyCompact(2_286_954_323_581)).toBe("$2.29T");
    expect(formatCurrencyCompact(365_808_412_688)).toBe("$365.81B");
  });
});

describe("formatPercent", () => {
  it("always carries an explicit sign for non-zero values", () => {
    expect(formatPercent(2.5)).toBe("+2.50%");
    expect(formatPercent(-1.25)).toBe("-1.25%");
  });
});

describe("describeDelta", () => {
  it("spells out the direction, since screen readers read '+' inconsistently", () => {
    expect(describeDelta(2.5, "24 hours")).toBe("up 2.50 percent over 24 hours");
    expect(describeDelta(-1.25, "7 days")).toBe("down 1.25 percent over 7 days");
    expect(describeDelta(null, "7 days")).toBe("No change data for 7 days");
  });
});

describe("formatRelativeTime", () => {
  const NOW = Date.parse("2026-07-28T16:00:00Z");

  it("describes recency in the largest sensible unit", () => {
    expect(formatRelativeTime(NOW - 30_000, NOW)).toBe("just now");
    expect(formatRelativeTime(NOW - 5 * 60_000, NOW)).toBe("5m ago");
    expect(formatRelativeTime(NOW - 3 * 3_600_000, NOW)).toBe("3h ago");
    expect(formatRelativeTime(NOW - 2 * 86_400_000, NOW)).toBe("2d ago");
  });

  it("treats a future timestamp as 'just now' rather than negative time", () => {
    expect(formatRelativeTime(NOW + 60_000, NOW)).toBe("just now");
  });
});
