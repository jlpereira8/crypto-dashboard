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

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full p-6 space-y-10 min-h-screen flex flex-col">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
          <div className="md:col-span-3 col-span-1">
            <div className="bg-white rounded-2xl shadow p-6 mb-1">
              <h2 className="text-2xl font-semibold">Title:</h2>
              <p className="text-gray-500 text-sm">Subtitle:</p>
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
            <div className="bg-white rounded-2xl shadow p-6">
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
            <div className="bg-white rounded-2xl shadow p-6 h-full">
              <h2 className="text-2xl font-semibold mb-4">Side Column</h2>
              <p className="text-gray-500 text-sm">This column takes ~35% width on desktop.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}