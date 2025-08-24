// components/PlayerChartsClient.tsx
"use client";

import React from "react";
import MetricBarChart, { MetricPoint } from "./MetricBarChart";

export type SeriesMap = Record<string, MetricPoint[]>;

type Props = {
  title: string;
  series: SeriesMap; // e.g., { "Passing Yards": [...], "Rushing Yards": [...] }
};

export default function PlayerChartsClient({ title, series }: Props) {
  const entries = Object.entries(series);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {entries.map(([name, data]) => (
          <MetricBarChart key={name} title={name} data={data} />
        ))}
      </div>
    </section>
  );
}
