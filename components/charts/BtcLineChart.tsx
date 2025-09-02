"use client";

import dynamic from "next/dynamic";
const ResponsiveLine = dynamic(() => import("@nivo/line").then((m) => m.ResponsiveLine), { ssr: false });

type Point = { x: string | number | Date; y: number };
type Series = { id: string; data: Point[] };

export default function BtcLineChart({ data, days = 7 }: { data: Series[]; days?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-gray-900 dark:text-gray-100">
      <h2 className="mb-3 text-2xl font-semibold">Bitcoin</h2>
      <div style={{ height: 400 }}>
        <ResponsiveLine
          data={data}
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