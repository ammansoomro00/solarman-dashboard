"use client";

import dynamic from "next/dynamic";

// Charts pull in Recharts (~100 kB); load them after the first paint, with a
// skeleton that reserves the same height so nothing jumps.

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div className="bg-surface-2/60 border-line relative overflow-hidden rounded-2xl border" style={{ height }} aria-hidden>
      {/* A faint curve hints at what's coming */}
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-2/3 w-full opacity-40">
        <path d="M0 95 C 90 95, 140 15, 200 15 S 310 95, 400 95" fill="none" stroke="var(--line-strong)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-0 animate-[shimmer-sweep_1.8s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--ink)_6%,transparent),transparent)]" />
    </div>
  );
}

export const LazyPowerDayChart = dynamic(() => import("./power-day-chart").then((m) => m.PowerDayChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={308} />,
});

export const LazyEnergyBarChart = dynamic(() => import("./energy-bar-chart").then((m) => m.EnergyBarChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={300} />,
});
