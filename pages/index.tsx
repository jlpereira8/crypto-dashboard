import Navbar from "../components/navbar/Navbar";
import BtcLineChart from "../components/charts/BtcLineChart";
import EthereumChart from "../components/charts/Ethereum";
import XRP from "../components/charts/XRP";
import { useQuery } from "@tanstack/react-query";

async function fetchCoins() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false"
  );
  return res.json();
}
async function fetchBTC() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30"
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
    queryKey: ["btc"],
    queryFn: fetchBTC,
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

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl p-6 space-y-10 h-screen flex flex-col">
        <section className="grid grid-cols-3 gap-6 flex-grow">
          <div>
            <h2 className="mb-3 text-2xl font-semibold">BTC (30 days)</h2>
            <BtcLineChart data={chartData} />
          </div>
          <div>
            <EthereumChart />
          </div>
          <div>
            <XRP />
          </div>
        </section>

        <section className="overflow-x-auto">
          <h2 className="mb-3 text-2xl font-semibold">Top 10</h2>
          <table className="min-w-full border">
            <thead className="bg-gray-200 dark:bg-gray-800">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Price</th>
                <th className="p-2">24h %</th>
                <th className="p-2">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {coins?.map((c: any) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2 flex items-center gap-2">
                    <img src={c.image} alt="" className="h-5 w-5" />
                    {c.name}
                  </td>
                  <td className="p-2">${c.current_price.toLocaleString()}</td>
                  <td className={`p-2 ${c.price_change_percentage_24h >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {c.price_change_percentage_24h.toFixed(2)}%
                  </td>
                  <td className="p-2">${c.market_cap.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}