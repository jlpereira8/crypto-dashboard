import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveLine } from "@nivo/line";

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
  title = "XRP (7 days)",
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
    <div style={{ height: 400 }}>
      <h2 className="mb-3 text-2xl font-semibold">{title}</h2>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: "auto", max: "auto", stacked: false, reverse: false }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: "Date",
          legendOffset: 36,
          legendPosition: "middle",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: `Price (${vs.toUpperCase()})`,
          legendOffset: -40,
          legendPosition: "middle",
        }}
        colors={{ scheme: "category10" }}
        pointSize={6}
        pointColor={{ theme: "background" }}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        pointLabelYOffset={-12}
        useMesh={true}
        legends={[
          {
            anchor: "bottom-right",
            direction: "column",
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: "left-to-right",
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: "circle",
            symbolBorderColor: "rgba(0, 0, 0, .5)",
            effects: [
              {
                on: "hover",
                style: {
                  itemBackground: "rgba(0, 0, 0, .03)",
                  itemOpacity: 1,
                },
              },
            ],
          },
        ]}
      />
    </div>
  );
}
