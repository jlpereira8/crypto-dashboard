import { ResponsiveLine } from "@nivo/line";

type Point = { x: string | number | Date; y: number };
type Series = { id: string; data: Point[] };

export default function BtcLineChart({ data }: { data: Series[] }) {
  return (
    <div style={{ height: 400 }}>
      <ResponsiveLine
        data={data}
        margin={{ top: 40, right: 40, bottom: 50, left: 60 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
        axisBottom={{ tickRotation: -45 }}
        pointSize={4}
        useMesh
      />
    </div>
  );
}