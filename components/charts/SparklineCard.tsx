"use client";
import React from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import type { ApexOptions } from "apexcharts";

type SparklineCardProps = {
  title: string;
  subtitle?: string;
  value: string;
  changePct?: number; // e.g. 6.75
  data: { x: number | string | Date; y: number }[];
  color?: string; // hex or css var, default orange
  height?: number;
  icon?: React.ReactNode;
};

export default function SparklineCard({
  title,
  subtitle,
  value,
  changePct,
  data,
  color = "#f59e0b", // amber-500-ish
  height = 120,
  icon,
}: SparklineCardProps & { height?: number }) {
  const isUp = changePct === undefined ? undefined : changePct >= 0;

  const options: ApexOptions = {
    chart: { type: "area", height, sparkline: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.5,
        opacityFrom: 0.35,
        opacityTo: 0,
        stops: [0, 90, 100],
      },
    },
    colors: [color],
    tooltip: {
      x: { show: false },
      y: { formatter: (val) => `$${val.toLocaleString()}` },
      fixed: { enabled: false },
      theme: "light",
    },
  };

  const series = [{ name: title, data }];

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-full grid place-items-center bg-black/5">
          {/* drop your asset icon here if you have one */}
          {icon ? icon : <span className="text-lg">₿</span>}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-tight">{title}</div>
          {subtitle && (
            <div className="text-xs text-black/50 leading-tight">{subtitle}</div>
          )}
        </div>
      </div>

      <Chart options={options} series={series} type="area" height={height} />

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xl font-semibold">{value}</div>
        {changePct !== undefined && (
          <div
            className={
              "text-sm font-medium flex items-center gap-1 " +
              (isUp ? "text-emerald-600" : "text-rose-600")
            }
          >
            <span>{(isUp ? "+" : "") + changePct.toFixed(2)}%</span>
            <span>{isUp ? "↗" : "↘"}</span>
          </div>
        )}
      </div>
    </div>
  );
}