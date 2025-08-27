 "use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
const ResponsiveLine = dynamic(() => import("@nivo/line").then((m) => m.ResponsiveLine), { ssr: false });

type XRPChartProps = {
  days?: number;
  vs?: string;
  title?: string;
};

type XRPApi = { prices: [number, number][] };

const fetchXRPData = async (days: number, vs: string) => {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/ripple/market_chart?vs_currency=${vs}&days=${days}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error("Network response was not ok");
  }
  return res.json();
};

export default function XRPChart({
  days = 7,
  vs = "usd",
  title = "XRP",
}: XRPChartProps) {
  const { data, isLoading, isError } = useQuery<XRPApi>({
    queryKey: ["xrpMarketChart", days, vs],
    queryFn: () => fetchXRPData(days, vs),
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading data</div>;

  const chartData = [
    {
      id: "XRP",
      data: (data?.prices ?? []).map((price: [number, number]) => ({
        x: new Date(price[0]).toLocaleDateString(),
        y: price[1],
      })),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 w-full">
      <h2 className="mb-3 text-2xl font-semibold">{title}</h2>
      <div className="w-full" style={{ height: 400, width: "100%" }}>
        <ResponsiveLine
          data={chartData}
          margin={{ top: 40, right: 40, bottom: 50, left: 60 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: "auto", max: "auto", stacked: false, reverse: false }}
          axisTop={null}
          axisRight={null}
          axisBottom={null}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: `Price (${vs.toUpperCase()})`,
            legendOffset: -40,
            legendPosition: "middle",
          }}
          pointSize={4}
          pointColor={{ theme: "background" }}
          pointBorderWidth={2}
          pointBorderColor={{ from: "serieColor" }}
          pointLabelYOffset={-12}
          useMesh={true}
        />
      </div>
    </div>
  );
}
