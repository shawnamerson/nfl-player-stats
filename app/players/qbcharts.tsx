// app/players/qbcharts.tsx
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

type Point = { week: number; value: number };

type Props = {
  title: string;
  data: Point[];
  height?: number;
  color?: string;
};

export default function QBChartsMini({
  title,
  data,
  height = 180,
  color = "#6366f1",
}: Props) {
  return (
    <div className="rounded-xl border p-3">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 6, right: 12, bottom: 6, left: 8 }}
          >
            <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
