import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketExplorer } from "../components/dashboard/MarketExplorer";
import { makeAsset } from "./fixtures";

/**
 * The explorer renders a short preview by default and expands to the full,
 * paginated list on demand. Exercised directly rather than through the page,
 * because triggering the expand affordance needs more assets than the shared
 * dashboard fixture set has.
 */
const MANY = Array.from({ length: 23 }, (_, index) =>
  makeAsset({
    id: `coin-${index}`,
    symbol: `C${index}`,
    name: `Coin ${index}`,
    rank: index + 1,
    price: 1000 - index,
  }),
);

function renderExplorer(assets = MANY) {
  const onSelect = vi.fn();
  render(
    <MarketExplorer
      assets={assets}
      selectedId={assets[0]?.id}
      onSelect={onSelect}
      isLoading={false}
      isRefreshing={false}
      isError={false}
      onRetry={() => {}}
    />,
  );
  return { onSelect };
}

/** Desktop table rows only — jsdom renders the mobile list too. */
const tableRows = () => {
  const table = screen.getByRole("table");
  return within(table).getAllByRole("row").slice(1); // drop the header row
};

describe("market explorer preview", () => {
  it("shows only six rows before expanding", () => {
    renderExplorer();
    expect(tableRows()).toHaveLength(6);
  });

  it("reports how many of the total are visible", () => {
    renderExplorer();
    expect(screen.getByText(/of 23 assets/i)).toBeInTheDocument();
  });

  it("offers a view-all affordance naming the total", () => {
    renderExplorer();
    expect(screen.getByRole("button", { name: /view all 23 markets/i })).toBeInTheDocument();
  });

  it("hides pagination while collapsed", () => {
    renderExplorer();
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
  });

  it("expands to the full page size and reveals pagination", async () => {
    const user = userEvent.setup();
    renderExplorer();

    await user.click(screen.getByRole("button", { name: /view all 23 markets/i }));

    expect(tableRows()).toHaveLength(10);
    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show less/i })).toBeInTheDocument();
  });

  it("collapses back to the preview", async () => {
    const user = userEvent.setup();
    renderExplorer();

    await user.click(screen.getByRole("button", { name: /view all 23 markets/i }));
    await user.click(screen.getByRole("button", { name: /show less/i }));

    expect(tableRows()).toHaveLength(6);
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
  });

  it("reaches every asset once expanded", async () => {
    const user = userEvent.setup();
    renderExplorer();

    await user.click(screen.getByRole("button", { name: /view all 23 markets/i }));
    await user.click(screen.getByRole("button", { name: /next page/i }));
    await user.click(screen.getByRole("button", { name: /next page/i }));

    // 23 assets over 10 per page: the last page holds the remaining three.
    expect(tableRows()).toHaveLength(3);
    expect(within(screen.getByRole("table")).getByText("Coin 22")).toBeInTheDocument();
  });

  it("omits the affordance when everything already fits", () => {
    renderExplorer(MANY.slice(0, 4));
    expect(screen.queryByRole("button", { name: /view all/i })).not.toBeInTheDocument();
    expect(tableRows()).toHaveLength(4);
  });

  it("selecting a row reports the asset id", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderExplorer();

    const table = screen.getByRole("table");
    await user.click(within(table).getByRole("button", { name: /Coin 3/i }));

    expect(onSelect).toHaveBeenCalledWith("coin-3");
  });
});
