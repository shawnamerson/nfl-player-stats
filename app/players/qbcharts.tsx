// app/players/qbcharts.tsx
"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useMemo } from "react";

type Row = {
  week: number;
  label: string;
  opp: string | null;
  game_date: string | null;

  pass_att: number;
  pass_cmp: number;
  pass_yds: number;
  pass_td: number;
  interceptions: number;
  pass_long: number;
  sacks: number;

  rush_att: number;
  rush_yds: number;
  rush_td: number;
  rush_long: number;
};

export default function QBCharts({ data }: { data: Row[] }) {
  const rows = useMemo(() => [...data].sort((a, b) => a.week - b.week), [data]);

  const charts: { key: keyof Row; title: string; domain?: [number, number] }[] = [
    { key: "pass_att",      title: "Passing Attempts" },
    { key: "pass_cmp",      title: "Passing Completions" },
    { key: "pass_yds",      title: "Passing Yards" },
    { key: "pass_td",       title: "Passing Touchdowns" },
    { key: "interceptions", title: "Interceptions", domain: [0, Math.max(1, max(rows, "interceptions"))] },
    { key: "pass_long",     title: "Passing Long" },
    { key: "sacks",         title: "Sacks" },
    { key: "rush_att",      title: "Rushing Attempts" },
    { key: "rush_yds",      title: "Rushing Yards" },
    { key: "rush_td",       title: "Rushing Touchdowns", domain: [0, Math.max(1, max(rows, "rush_td"))] },
    { key: "rush_long",     title: "Rushing Long" },
  ];

  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {charts.map((c) => (
        <ChartCard key={c.key as string} title={c.title}>
          <StatBar rows={rows} dataKey={c.key} domain={c.domain} />
        </ChartCard>
      ))}
    </section>
  );
}

function max<T extends Row>(rows: T[], key: keyof T): number {
  return rows.reduce((m, r) => Math.max(m, Number(r[key] ?? 0)), 0);
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm font-medium text-slate-700">{title}</div>
      <div className="h-56">{children}</div>
    </div>
  );
}

function StatBar({
  rows,
  dataKey,
  domain,
}: {
  rows: Row[];
  dataKey: keyof Row;
  domain?: [number, number];
}) {
  const maxVal = rows.reduce((m, r) => Math.max(m, Number(r[dataKey] ?? 0)), 0);
  const yDomain: [number, number] = domain ?? [0, Math.ceil((maxVal * 1.15) || 5)];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} height={40} />
        <YAxis domain={yDomain} width={36} tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          formatter={(value: any) => [value, String(dataKey)]}
          labelFormatter={(_, payload) => {
            const p = payload?.[0]?.payload as Row | undefined;
            const date = p?.game_date ? ` • ${p.game_date}` : "";
            return `${p?.label ?? ""}${date}`;
          }}
        />
        <ReferenceLine y={0} />
        <Bar dataKey={dataKey as string} />
      </BarChart>
    </ResponsiveContainer>
  );
}
