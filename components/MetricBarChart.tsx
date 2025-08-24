// components/MetricBarChart.tsx
"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export type MetricPoint = { label: string; value: number };

type Props = {
  title: string;
  data: MetricPoint[];
  height?: number;
  color?: string;
};

export default function MetricBarChart({
  title,
  data,
  height = 220,
  color = "#10b981",
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-4">
      <div className="mb-2 text-sm font-semibold text-white">{title}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 8, left: 8 }}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#fff" }} />
            <YAxis tick={{ fontSize: 11, fill: "#fff" }} />
            <Tooltip
              contentStyle={{
                background: "#000",
                border: "1px solid #333",
                color: "#fff",
              }}
              labelStyle={{ color: "#fff" }}
              formatter={(v: number) => [v, title]}
            />
            <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
