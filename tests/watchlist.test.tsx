import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Watchlist } from "../components/dashboard/Watchlist";
import { WatchButton } from "../components/markets/MarketsTable";
import { DEFAULT_WATCHLIST, useWatchlist } from "../lib/useWatchlist";
import { ASSETS, makeAsset } from "./fixtures";

/**
 * The watchlist is backed by localStorage through an external store, which is the
 * easiest thing in the app to get subtly wrong: an unstable snapshot reference
 * makes `useSyncExternalStore` re-render forever, and reading storage during SSR
 * would break hydration.
 */

function Harness({ assets = ASSETS }: { assets?: typeof ASSETS }) {
  return (
    <Watchlist assets={assets} selectedId={undefined} onSelect={() => {}} isLoading={false} />
  );
}

/** Exercises the hook directly, for the store's own behaviour. */
function StoreProbe() {
  const { ids, toggle, count, clear, restoreDefaults } = useWatchlist();
  return (
    <div>
      <span data-testid="count">{count}</span>
      <span data-testid="ids">{ids.join(",")}</span>
      <button type="button" onClick={() => toggle("btc-bitcoin")}>
        toggle btc
      </button>
      <button type="button" onClick={() => toggle("eth-ethereum")}>
        toggle eth
      </button>
      <button type="button" onClick={() => toggle("link-chainlink")}>
        toggle link
      </button>
      <button type="button" onClick={clear}>
        clear all
      </button>
      <button type="button" onClick={restoreDefaults}>
        restore
      </button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("watchlist store", () => {
  it("starts a first-time visitor on the default list", () => {
    render(<StoreProbe />);
    expect(screen.getByTestId("count")).toHaveTextContent(String(DEFAULT_WATCHLIST.length));
    expect(screen.getByTestId("ids")).toHaveTextContent(DEFAULT_WATCHLIST.join(","));
  });

  it("does not write to storage just for being read", () => {
    render(<StoreProbe />);
    // Defaults are returned, not persisted — the list only becomes the user's
    // once they touch it.
    expect(window.localStorage.getItem("watchlist")).toBeNull();
  });

  it("adds an id on top of the defaults and persists the result", async () => {
    const user = userEvent.setup();
    render(<StoreProbe />);

    await user.click(screen.getByRole("button", { name: /toggle link/i }));
    expect(screen.getByTestId("count")).toHaveTextContent(String(DEFAULT_WATCHLIST.length + 1));
    expect(JSON.parse(window.localStorage.getItem("watchlist") ?? "null")).toEqual([
      ...DEFAULT_WATCHLIST,
      "link-chainlink",
    ]);
  });

  it("removes a default when toggled off", async () => {
    const user = userEvent.setup();
    render(<StoreProbe />);

    await user.click(screen.getByRole("button", { name: /toggle btc/i }));
    expect(screen.getByTestId("ids")).not.toHaveTextContent("btc-bitcoin");
    expect(screen.getByTestId("count")).toHaveTextContent(String(DEFAULT_WATCHLIST.length - 1));
  });

  it("keeps an explicitly emptied list empty — the defaults do not come back", () => {
    // The regression that matters: seeding on a falsy value rather than on an
    // absent key would resurrect items the user deliberately removed.
    window.localStorage.setItem("watchlist", JSON.stringify([]));
    render(<StoreProbe />);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("offers a way back from an emptied list", async () => {
    // Not resurrecting a cleared list is correct, but without an explicit restore
    // a user who ended at zero would be stuck on an empty panel forever.
    const user = userEvent.setup();
    render(<StoreProbe />);

    await user.click(screen.getByRole("button", { name: /clear all/i }));
    expect(screen.getByTestId("count")).toHaveTextContent("0");

    await user.click(screen.getByRole("button", { name: /restore/i }));
    expect(screen.getByTestId("ids")).toHaveTextContent(DEFAULT_WATCHLIST.join(","));
    // Restoring persists, so it survives a reload.
    expect(JSON.parse(window.localStorage.getItem("watchlist") ?? "null")).toEqual([
      ...DEFAULT_WATCHLIST,
    ]);
  });

  it("preserves the order ids were starred in", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("watchlist", JSON.stringify([]));
    render(<StoreProbe />);

    await user.click(screen.getByRole("button", { name: /toggle eth/i }));
    await user.click(screen.getByRole("button", { name: /toggle btc/i }));
    expect(screen.getByTestId("ids")).toHaveTextContent("eth-ethereum,btc-bitcoin");
  });

  it("reads an existing value on mount", () => {
    window.localStorage.setItem("watchlist", JSON.stringify(["xrp-xrp"]));
    render(<StoreProbe />);
    expect(screen.getByTestId("ids")).toHaveTextContent("xrp-xrp");
  });

  it("ignores a corrupt stored value instead of throwing", () => {
    // The key exists, so a list was established at some point. We can't recover
    // it, but we don't invent one either — falling back to the defaults here
    // could re-add something the user had removed.
    window.localStorage.setItem("watchlist", "{not json");
    render(<StoreProbe />);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("drops non-string entries from a tampered value", () => {
    window.localStorage.setItem("watchlist", JSON.stringify(["btc-bitcoin", 42, null]));
    render(<StoreProbe />);
    expect(screen.getByTestId("ids")).toHaveTextContent("btc-bitcoin");
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("returns a stable snapshot, so it does not re-render endlessly", () => {
    // An unstable getSnapshot would blow the render budget before this resolves.
    const renders = vi.fn();
    function Counting() {
      renders();
      useWatchlist();
      return null;
    }
    render(<Counting />);
    expect(renders.mock.calls.length).toBeLessThan(5);
  });
});

describe("Watchlist panel", () => {
  it("opens on the default list rather than an empty state", () => {
    render(<Harness />);
    expect(screen.queryByText(/your watchlist is empty/i)).not.toBeInTheDocument();
    // Only the defaults present in the loaded market list can render.
    const rows = screen.getByRole("list").querySelectorAll("li");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("falls back to the empty state once the user clears it, with a way back", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("watchlist", JSON.stringify([]));
    render(<Harness />);

    expect(screen.getByText(/your watchlist is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse markets/i })).toHaveAttribute(
      "href",
      "/markets",
    );

    await user.click(screen.getByRole("button", { name: /restore defaults/i }));
    expect(screen.queryByText(/your watchlist is empty/i)).not.toBeInTheDocument();
    expect(within(screen.getByRole("list")).getByText("Bitcoin")).toBeInTheDocument();
  });

  it("lists starred assets once they exist", () => {
    window.localStorage.setItem(
      "watchlist",
      JSON.stringify(["eth-ethereum", "btc-bitcoin"]),
    );
    render(<Harness />);

    const list = screen.getByRole("list");
    expect(within(list).getByText("Ethereum")).toBeInTheDocument();
    expect(within(list).getByText("Bitcoin")).toBeInTheDocument();
    // Starred order, not market-cap order.
    expect(within(list).getAllByRole("button")[0]).toHaveAccessibleName(/Ethereum/i);
  });

  it("skips starred ids that are not in the loaded market list", () => {
    window.localStorage.setItem("watchlist", JSON.stringify(["btc-bitcoin", "not-listed"]));
    render(<Harness />);
    expect(screen.getByRole("list").querySelectorAll("li")).toHaveLength(1);
  });

  it("caps the visible rows at five and says how many are hidden", () => {
    const extra = makeAsset({ id: "x6", symbol: "X6", name: "Sixth", rank: 6 });
    window.localStorage.setItem(
      "watchlist",
      JSON.stringify([...ASSETS.map((a) => a.id), "x6"]),
    );
    render(<Harness assets={[...ASSETS, extra]} />);
    expect(screen.getByRole("list").querySelectorAll("li")).toHaveLength(5);
    expect(screen.getByText(/1 more starred/i)).toBeInTheDocument();
  });

  it("reflects a star toggled elsewhere in the same page", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("watchlist", JSON.stringify([]));
    render(
      <>
        <WatchButton active={false} name="Bitcoin" onClick={() => {}} />
        <StoreProbe />
        <Harness />
      </>,
    );

    expect(screen.getByText(/your watchlist is empty/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /toggle btc/i }));

    // One store, so the panel updates without any prop being passed to it.
    await waitFor(() =>
      expect(screen.queryByText(/your watchlist is empty/i)).not.toBeInTheDocument(),
    );
    expect(within(screen.getByRole("list")).getByText("Bitcoin")).toBeInTheDocument();
  });
});

describe("WatchButton", () => {
  it("exposes its state and names the asset", () => {
    render(<WatchButton active={false} name="Bitcoin" onClick={() => {}} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAccessibleName(/add bitcoin to watchlist/i);
  });

  it("changes its accessible name when active", () => {
    render(<WatchButton active name="Bitcoin" onClick={() => {}} />);
    expect(screen.getByRole("button")).toHaveAccessibleName(/remove bitcoin from watchlist/i);
  });
});
