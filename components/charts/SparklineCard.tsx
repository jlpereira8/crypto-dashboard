"use client";
import React, { useEffect, useState } from "react";
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
  iconBg?: string; // background color for the circular icon (any CSS color)
  iconFg?: string; // foreground color for the glyph
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
  iconBg,
  iconFg,
}: SparklineCardProps & { height?: number }) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains("dark"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const isUp = changePct === undefined ? undefined : changePct >= 0;

  const hexToRgba = (hex: string, alpha: number) => {
    const m = hex.replace('#','');
    const bigint = parseInt(m.length === 3 ? m.split('').map(c=>c+c).join('') : m, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const iconBgColor = iconBg ?? hexToRgba(color, isDark ? 0.25 : 0.15);
  const iconFgColor = iconFg ?? color;

  const options: ApexOptions = {
    chart: { type: "area", height, sparkline: { enabled: true }, background: "transparent", foreColor: isDark ? "#e5e7eb" : "#111827" },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 0.5, opacityFrom: 0.35, opacityTo: 0, stops: [0, 90, 100] },
    },
    colors: [color],
    theme: { mode: isDark ? "dark" : "light" },
    tooltip: {
      x: { show: false },
      y: { formatter: (val) => `$${val.toLocaleString()}` },
      fixed: { enabled: false },
      theme: isDark ? "dark" : "light",
      fillSeriesColor: false,
    },
  };

  const series = [{ name: title, data }];

  return (
    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow p-4">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="h-8 w-8 rounded-full grid place-items-center"
          style={{ backgroundColor: iconBgColor, color: iconFgColor }}
        >
          {icon ? icon : <span className="text-lg">₿</span>}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-tight">{title}</div>
          {subtitle && (
            <div className="text-xs text-black/50 dark:text-gray-400 leading-tight">{subtitle}</div>
          )}
        </div>
      </div>

      <Chart key={isDark ? "dark" : "light"} options={options} series={series} type="area" height={height} />

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