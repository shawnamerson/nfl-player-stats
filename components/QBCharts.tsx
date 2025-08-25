// components/QBCharts.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";

const HOT_PINK = "#ff3ea5";
const GRID = "rgba(255,62,165,0.25)";
const LIME = "#a3e635";

export type QBRow = {
  week: number;
  label?: string;
  opp?: string;
  game_date?: string | null;
  pass_att?: number | null;
  pass_cmp?: number | null;
  pass_yds?: number | null;
  pass_td?: number | null;
  interceptions?: number | null;
  pass_long?: number | null;
  sacks?: number | null;
  rush_att?: number | null;
  rush_yds?: number | null;
  rush_td?: number | null;
  rush_long?: number | null;
};

type Props = { data: QBRow[]; height?: number };
type Point = { week: number; value: number };

export default function QBCharts({ data, height = 260 }: Props) {
  const mkSeries = (key: keyof QBRow): Point[] =>
    data.map((r) => ({
      week: r.week,
      value:
        r[key] === null || r[key] === undefined || Number.isNaN(Number(r[key]))
          ? 0
          : Number(r[key]),
    }));

  const charts: { key: keyof QBRow; title: string }[] = [
    { key: "pass_att", title: "Passing Attempts" },
    { key: "pass_cmp", title: "Completions" },
    { key: "pass_yds", title: "Passing Yards" },
    { key: "pass_td", title: "Passing TDs" },
    { key: "interceptions", title: "Interceptions" },
    { key: "pass_long", title: "Pass Long" },
    { key: "sacks", title: "Sacks" },
    { key: "rush_att", title: "Rushing Attempts" },
    { key: "rush_yds", title: "Rushing Yards" },
    { key: "rush_td", title: "Rushing TDs" },
    { key: "rush_long", title: "Rushing Long" },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {charts.map(({ key, title }) => (
        <ChartCard
          key={String(key)}
          title={title}
          data={mkSeries(key)}
          height={height}
        />
      ))}
    </section>
  );
}

function ChartCard({
  title,
  data,
  height,
}: {
  title: string;
  data: Point[];
  height: number;
}) {
  const [lineStr, setLineStr] = useState<string>("");
  const line = useMemo(() => {
    const n = parseFloat(lineStr);
    return Number.isFinite(n) ? n : null;
  }, [lineStr]);

  const { hits, pct } = useMemo(() => {
    if (line === null || data.length === 0) return { hits: 0, pct: 0 };
    const h = data.filter((d) => d.value > line).length; // strictly over
    return { hits: h, pct: Math.round((h / data.length) * 100) };
  }, [line, data]);

  return (
    <div className="h-full rounded-2xl border border-zinc-800 bg-black p-3 shadow-lg">
      {/* header */}
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="flex items-center gap-2">
          <label htmlFor={`${title}-line`} className="text-xs text-zinc-400">
            Prop Line
          </label>
          <input
            id={`${title}-line`}
            inputMode="decimal"
            placeholder="e.g. 275"
            value={lineStr}
            onChange={(e) => setLineStr(e.target.value)}
            className="w-24 rounded-lg border border-zinc-800 bg-black px-2 py-1 text-xs text-white outline-none focus:border-zinc-700"
          />
          {line !== null && (
            <span
              className="rounded-md px-2 py-1 text-[11px] font-semibold"
              style={{
                color: LIME,
                border: `1px solid ${LIME}`,
                background: "rgba(163,230,53,.06)",
              }}
              title="Hit weeks / total (strictly over the line)"
            >
              HIT {hits}/{data.length} • {pct}%
            </span>
          )}
        </div>
      </div>

      {/* chart wrapper:
          - Mobile: use aspect-ratio so height grows with width (fills the card)
          - ≥ sm: fixed pixel height for stable desktop layout
      */}
      <div className="w-full aspect-[16/13] sm:aspect-auto sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
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
              itemStyle={{ color: "#fff" }}
              formatter={(value: number) => [value, title]}
              labelFormatter={(week: number) => `Week ${week}`}
            />
            {line !== null && (
              <ReferenceLine y={line} stroke={LIME} strokeDasharray="4 4" />
            )}
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => {
                const hit = line !== null && d.value > line;
                return <Cell key={`c-${i}`} fill={hit ? LIME : HOT_PINK} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
