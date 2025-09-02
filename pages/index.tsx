import React, { useMemo, useState } from "react";
import Navbar from "../components/navbar/Navbar";
import BtcLineChart from "../components/charts/BtcLineChart";
import EthereumChart from "../components/charts/Ethereum";
import XRP from "../components/charts/XRP";
import SparklineCard from "../components/charts/SparklineCard";
import { useQuery } from "@tanstack/react-query";

async function fetchCoins() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false"
  );
  return res.json();
}
async function fetchBTC(days: number = 7) {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`
  );
  return res.json();
}

async function fetchETH(days: number = 7) {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=${days}`
  );
  return res.json();
}

async function fetchXRP(days: number = 7) {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/ripple/market_chart?vs_currency=usd&days=${days}`
  );
  return res.json();
}

export default function Home() {
  const { data: coins } = useQuery({
    queryKey: ["coins"],
    queryFn: fetchCoins,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    staleTime: Infinity,

  });
  const { data: btc } = useQuery({
    queryKey: ["btc", 7],
    queryFn: () => fetchBTC(7),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    staleTime: Infinity,
  });

  const { data: eth } = useQuery({
    queryKey: ["eth", 7],
    queryFn: () => fetchETH(7),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    staleTime: Infinity,
  });

  const { data: xrp } = useQuery({
    queryKey: ["xrp", 7],
    queryFn: () => fetchXRP(7),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    staleTime: Infinity,
  });

  const chartData = btc
    ? [
        {
          id: "BTC",
          data: btc.prices.map((p: [number, number]) => ({
            x: new Date(p[0]).toLocaleDateString(),
            y: p[1],
          })),
        },
      ]
    : [];

  const btcSeries = (btc?.prices ?? []).map((p: [number, number]) => ({
    x: p[0],
    y: Number(p[1]),
  }));
  const btcChangePct = btcSeries.length > 1 ? ((btcSeries.at(-1)!.y - btcSeries[0].y) / btcSeries[0].y) * 100 : 0;

  const ethSeries = (eth?.prices ?? []).map((p: [number, number]) => ({
    x: p[0],
    y: Number(p[1]),
  }));
  const ethChangePct = ethSeries.length > 1 ? ((ethSeries.at(-1)!.y - ethSeries[0].y) / ethSeries[0].y) * 100 : 0;

  const xrpSeries = (xrp?.prices ?? []).map((p: [number, number]) => ({
    x: p[0],
    y: Number(p[1]),
  }));
  const xrpChangePct = xrpSeries.length > 1 ? ((xrpSeries.at(-1)!.y - xrpSeries[0].y) / xrpSeries[0].y) * 100 : 0;

  const [fromId, setFromId] = useState<string>("bitcoin");
  const [toId, setToId] = useState<string>("ethereum");
  const [amount, setAmount] = useState<number>(1);

  const coinMap = useMemo(() => {
    const map: Record<string, any> = {};
    (coins ?? []).forEach((c: any) => (map[c.id] = c));
    return map;
  }, [coins]);

  const fromCoin = coinMap[fromId];
  const toCoin = coinMap[toId];

  const result = useMemo(() => {
    if (!fromCoin || !toCoin || !amount || isNaN(amount)) return 0;
    const usdFrom = Number(fromCoin.current_price);
    const usdTo = Number(toCoin.current_price);
    if (!usdFrom || !usdTo) return 0;
    return amount * (usdFrom / usdTo);
  }, [fromCoin, toCoin, amount]);

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full p-6 space-y-10 min-h-screen flex flex-col">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
          <div className="md:col-span-3 col-span-1">
            <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow p-6 mb-1">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white/70 ring-1 ring-black/10 backdrop-blur dark:bg-gray-900/60 dark:ring-white/10">
                  {/* island logomark echo */}
                  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 text-indigo-600 dark:text-indigo-300">
                    <path d="M12 10c-.6 0-1 .4-1 1v7h2v-7c0-.6-.4-1-1-1z" fill="currentColor" />
                    <path d="M12 9c1.8-2.5 4.6-3.2 7-2.2-1.9.6-3.4 1.5-4.4 2.6 2.4-.2 4.3.6 5.4 1.9-2.2-.7-4.2-.6-5.8.1 1.3 1.1 2 2.3 2.2 3.6-1.5-1.6-3.1-2.5-4.4-2.8-1.3.3-2.9 1.2-4.4 2.8.2-1.3.9-2.5 2.2-3.6-1.6-.7-3.6-.8-5.8-.1 1.1-1.3 3-2.1 5.4-1.9-1-1.1-2.5-2-4.4-2.6 2.4-1 5.2-.3 7 2.2z" fill="currentColor" />
                    <path d="M5 20c0-1.7 3.1-3 7-3s7 1.3 7 3H5z" fill="currentColor" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold">Welcome back, Elizabeth!</h2>
              </div>
              <p className="mt-2 text-gray-500 text-sm">
                View real-time crypto prices and charts. Analyze performance, exchange assets, and review wallet balances with ease.
              </p>
            </div>
          </div>
          <SparklineCard
            title="Bitcoin"
            subtitle="BTC"
            value={`$${(btcSeries.at(-1)?.y ?? 0).toLocaleString()}`}
            changePct={btcChangePct}
            data={btcSeries}
            color="#F59E0B"
            height={160}
            icon={<span className="text-lg">₿</span>}
          />
          <SparklineCard
            title="Ethereum"
            subtitle="ETH"
            value={`$${(ethSeries.at(-1)?.y ?? 0).toLocaleString()}`}
            changePct={ethChangePct}
            data={ethSeries}
            color="#3B82F6"
            height={160}
            icon={<span className="text-lg">Ξ</span>}
          />
          <SparklineCard
            title="XRP"
            subtitle="XRP"
            value={`$${(xrpSeries.at(-1)?.y ?? 0).toLocaleString()}`}
            changePct={xrpChangePct}
            data={xrpSeries}
            color="#6366F1"
            height={160}
            icon={<span className="text-lg">✕</span>}
          />

          {/* Full-width table below on md+ */}
          <div className="md:col-span-2 col-span-1">
            <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Top 10</h2>
              </div>
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="min-w-full table-auto text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-2 font-semibold">Asset</th>
                      <th className="px-3 py-2 font-semibold">Price</th>
                      <th className="px-3 py-2 font-semibold">24h</th>
                      <th className="px-3 py-2 font-semibold">Market Cap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coins?.map((c: any) => {
                      const up = c.price_change_percentage_24h >= 0;
                      const changeClass = up
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                        : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200";
                      const arrow = up ? "↗" : "↘";
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/60">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <img src={c.image} alt={c.name} className="h-6 w-6 rounded-full" />
                              <div className="flex flex-col">
                                <span className="font-medium leading-tight">{c.name}</span>
                                <span className="text-[11px] uppercase tracking-wide text-gray-500">{c.symbol}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 tabular-nums">${c.current_price.toLocaleString()}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${changeClass}`}>
                              <span>{arrow}</span>
                              <span>{Math.abs(c.price_change_percentage_24h).toFixed(2)}%</span>
                            </span>
                          </td>
                          <td className="px-3 py-3 tabular-nums">${c.market_cap.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="md:col-span-1 col-span-1">
            <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow p-6 h-full">
              <h2 className="text-2xl font-semibold mb-4">Exchange</h2>
              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                {/* FROM */}
                <div>
                  <label htmlFor="from" className="mb-2 block text-sm font-medium">From</label>
                  <div className="relative rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm px-3 py-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                        <span aria-hidden>₿</span>
                      </div>
                      <div className="relative flex-1">
                        <select
                          id="from"
                          value={fromId}
                          onChange={(e) => setFromId(e.target.value)}
                          className="w-full appearance-none cursor-pointer bg-transparent pr-6 text-sm font-medium outline-none"
                          aria-label="From asset"
                        >
                          {(coins ?? []).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.symbol?.toUpperCase()})</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
                      </div>
                    </div>
                  </div>
                  <input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-3 text-right text-sm font-medium outline-none placeholder:text-gray-400 mb-3"
                    placeholder="0.0000"
                    aria-describedby="amount-help"
                  />
                </div>

                {/* TO */}
                <div>
                  <label htmlFor="to" className="mb-2 block text-sm font-medium">To</label>
                  <div className="relative rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm px-3 py-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <span aria-hidden>$</span>
                      </div>
                      <div className="relative flex-1">
                        <select
                          id="to"
                          value={toId}
                          onChange={(e) => setToId(e.target.value)}
                          className="w-full appearance-none cursor-pointer bg-transparent pr-6 text-sm font-medium outline-none"
                          aria-label="To asset"
                        >
                          {(coins ?? []).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.symbol?.toUpperCase()})</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-3 text-right text-sm font-semibold tabular-nums mb-3">
                    {result ? result.toLocaleString(undefined, { maximumFractionDigits: 8 }) : 0}
                  </div>
                </div>

                {/* rate hint */}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  1 {fromCoin?.symbol?.toUpperCase()} = {fromCoin && toCoin ? (fromCoin.current_price / toCoin.current_price).toLocaleString(undefined, { maximumFractionDigits: 6 }) : "0"} {toCoin?.symbol?.toUpperCase()}
                </p>

                {/* CTA */}
                <button
                  type="button"
                  className="w-full rounded-2xl bg-[#1177FF] px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#0f6ae5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1177FF] disabled:opacity-50"
                  disabled={!fromCoin || !toCoin || !amount}
                  aria-disabled={!fromCoin || !toCoin || !amount}
                >
                  Exchange Now
                </button>
                <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>
              </form>
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-4">Wallet</h3>
                <ul className="space-y-3">
                  <li className="flex items-center justify-between rounded-xl bg-white dark:bg-gray-900 p-3 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300">
                        ◈
                      </div>
                      <span className="font-medium">BNB</span>
                    </div>
                    <span className="tabular-nums text-sm font-semibold">$12,345</span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-white dark:bg-gray-900 p-3 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
                        ✕
                      </div>
                      <span className="font-medium">XRP</span>
                    </div>
                    <span className="tabular-nums text-sm font-semibold">$7,890</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}