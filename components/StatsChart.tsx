// components/StatChart.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const HOT_PINK = "#ff3ea5";
const GRID = "rgba(255,62,165,0.25)";

export type StatPoint = { week: number; value: number };

export default function StatChart({
  title,
  data,
  height = 240,
}: {
  title: string;
  data: StatPoint[];
  height?: number;
}) {
  return (
    <div className="surface p-4" style={{ backgroundColor: "#000" }}>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 8, left: 12 }}
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="week"
              stroke={HOT_PINK}
              tick={{ fill: HOT_PINK, fontSize: 11 }}
              tickLine={{ stroke: HOT_PINK }}
              axisLine={{ stroke: HOT_PINK }}
            />
            <YAxis
              stroke={HOT_PINK}
              tick={{ fill: HOT_PINK, fontSize: 11 }}
              tickLine={{ stroke: HOT_PINK }}
              axisLine={{ stroke: HOT_PINK }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,62,165,0.08)" }}
              contentStyle={{
                background: "#000",
                border: `1px solid ${HOT_PINK}`,
                borderRadius: 12,
                color: "#fff",
                padding: "8px 10px",
              }}
              labelStyle={{ color: "#fff" }}
              itemStyle={{ color: HOT_PINK }}
            />
            <Bar dataKey="value" fill={HOT_PINK} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
