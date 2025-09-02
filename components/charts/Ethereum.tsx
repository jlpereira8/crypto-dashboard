"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
const ResponsiveLine = dynamic(() => import("@nivo/line").then((m) => m.ResponsiveLine), { ssr: false });

// Types for the chart series
type Point = { x: string | number | Date; y: number };
interface Series { id: string; data: Point[] }

async function fetchETH(days: number, vs: string) {
  const url = `https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=${vs}&days=${days}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch ETH data");
  return res.json();
}

export default function EthereumChart({ days = 7, vs = "usd", title = "ETH" }: { days?: number; vs?: string; title?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["eth", days, vs],
    queryFn: () => fetchETH(days, vs),
  });

  if (isLoading) return <div className="h-[400px] grid place-items-center">Loading ETH…</div>;
  if (isError || !data?.prices) return <div className="h-[400px] grid place-items-center text-red-600">Error loading ETH data</div>;

  const series: Series[] = [
    {
      id: "ETH",
      data: data.prices.map((p: [number, number]) => ({
        x: new Date(p[0]).toLocaleDateString(),
        y: p[1],
      })),
    },
  ];

  return (
   <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-gray-900 dark:text-gray-100">
      <h2 className="mb-3 text-2xl font-semibold">{title}</h2>
      <div style={{ height: 400 }}>
        <ResponsiveLine
          data={series}
          margin={{ top: 40, right: 40, bottom: 50, left: 60 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
          axisBottom={null}
          pointSize={4}
          useMesh
        />
      </div>
    </div>
  );
}