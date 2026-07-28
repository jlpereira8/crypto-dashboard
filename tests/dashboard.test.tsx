import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OverviewPage from "../pages/index";
import { stubFetch } from "./fixtures";

/**
 * Integration coverage for the behaviour that spans every layer: picking a row
 * in the Market Explorer re-points the chart, and costs exactly one extra
 * request.
 *
 * Note that jsdom applies no CSS, so the `hidden md:block` desktop table *and*
 * the mobile card list are both present. Asset names therefore appear more than
 * once, and every query below is either scoped to a region or uses an `All`
 * variant on purpose.
 */
function renderDashboard() {
  const calls = stubFetch();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  const result = render(
    <QueryClientProvider client={client}>
      <OverviewPage />
    </QueryClientProvider>,
  );

  return { ...result, calls };
}

const chartCard = () => screen.getByRole("region", { name: /selected asset price chart/i });
const explorer = () => screen.getByRole("region", { name: /market explorer/i });

/**
 * The first selectable control for an asset, scoped to the market table.
 *
 * Scoping matters: the Portfolio and Top Gainers panels also name assets, and the
 * Portfolio panel renders from fixtures on the very first paint. An unscoped
 * query would match those and resolve before the API data arrived.
 */
const assetButton = (name: RegExp) => within(explorer()).getAllByRole("button", { name })[0];

/** Resolves once the market table has real rows, not skeletons. */
const waitForRows = () =>
  waitFor(() =>
    expect(within(explorer()).getAllByRole("button", { name: /Bitcoin/i }).length).toBeGreaterThan(
      0,
    ),
  );

const historyCalls = (calls: string[]) => calls.filter((url) => url.includes("/historical"));

describe("dashboard requests", () => {
  it("issues exactly three requests on initial load", async () => {
    const { calls } = renderDashboard();
    await waitForRows();
    await waitFor(() => expect(calls.length).toBe(3));

    expect(calls.filter((url) => url.includes("/tickers?"))).toHaveLength(1);
    expect(calls.filter((url) => url.includes("/global"))).toHaveLength(1);
    expect(historyCalls(calls)).toHaveLength(1);
    // One history request for the default asset — never one per asset.
    expect(historyCalls(calls)[0]).toContain("btc-bitcoin");
  });
});

describe("selected asset drives the chart", () => {
  it("defaults to Bitcoin", async () => {
    renderDashboard();
    await waitFor(() =>
      expect(within(chartCard()).getByRole("heading", { name: "Bitcoin" })).toBeInTheDocument(),
    );
    expect(within(chartCard()).getByText("$64,000")).toBeInTheDocument();
  });

  it("selecting a row updates the chart and fetches only that asset's history", async () => {
    const user = userEvent.setup();
    const { calls } = renderDashboard();

    await waitForRows();
    const before = calls.length;

    await user.click(assetButton(/Ethereum/i));

    await waitFor(() =>
      expect(within(chartCard()).getByRole("heading", { name: "Ethereum" })).toBeInTheDocument(),
    );
    expect(within(chartCard()).getByText("$3,400")).toBeInTheDocument();

    const added = calls.slice(before);
    expect(added).toHaveLength(1);
    expect(added[0]).toContain("eth-ethereum");
    expect(added[0]).toContain("/historical");
  });

  it("marks the selected asset as pressed", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitForRows();
    expect(assetButton(/Bitcoin/i)).toHaveAttribute("aria-pressed", "true");

    await user.click(assetButton(/Ethereum/i));

    await waitFor(() => expect(assetButton(/Ethereum/i)).toHaveAttribute("aria-pressed", "true"));
    expect(assetButton(/Bitcoin/i)).toHaveAttribute("aria-pressed", "false");
  });

  it("re-uses the cache when returning to an asset, issuing no new request", async () => {
    const user = userEvent.setup();
    const { calls } = renderDashboard();

    await waitForRows();
    await user.click(assetButton(/Ethereum/i));
    await waitFor(() => expect(historyCalls(calls)).toHaveLength(2));

    await user.click(assetButton(/Bitcoin/i));
    await waitFor(() =>
      expect(within(chartCard()).getByRole("heading", { name: "Bitcoin" })).toBeInTheDocument(),
    );

    // Bitcoin's history is still cached and fresh, so nothing is refetched.
    expect(historyCalls(calls)).toHaveLength(2);
  });

  it("preserves the selected range when switching assets", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitForRows();
    await user.click(screen.getByRole("radio", { name: /30D/i }));
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /30D/i })).toHaveAttribute("aria-checked", "true"),
    );

    await user.click(assetButton(/Ethereum/i));
    await waitFor(() =>
      expect(within(chartCard()).getByRole("heading", { name: "Ethereum" })).toBeInTheDocument(),
    );

    expect(screen.getByRole("radio", { name: /30D/i })).toHaveAttribute("aria-checked", "true");
  });
});

describe("market explorer derives locally", () => {
  it("searching filters the list without issuing a request", async () => {
    const user = userEvent.setup();
    const { calls } = renderDashboard();

    await waitForRows();
    const before = calls.length;

    await user.type(screen.getByRole("searchbox", { name: /search assets/i }), "solana");

    await waitFor(() => expect(within(explorer()).queryAllByText("Ethereum")).toHaveLength(0));
    expect(within(explorer()).getAllByText("Solana").length).toBeGreaterThan(0);
    expect(calls).toHaveLength(before);
  });

  it("filter tabs and pagination issue no requests", async () => {
    const user = userEvent.setup();
    const { calls } = renderDashboard();

    await waitForRows();
    const before = calls.length;

    await user.click(screen.getByRole("tab", { name: "Losers" }));
    // Bitcoin is a gainer in the fixtures, so it leaves the table entirely.
    await waitFor(() => expect(within(explorer()).queryAllByText("Bitcoin")).toHaveLength(0));

    expect(calls).toHaveLength(before);
  });

  it("shows an empty state when a search matches nothing", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitForRows();
    await user.type(screen.getByRole("searchbox", { name: /search assets/i }), "zzzz");

    expect(await screen.findByText(/no assets match your search/i)).toBeInTheDocument();
  });
});
