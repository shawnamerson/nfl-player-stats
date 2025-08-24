"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  Line,
} from "recharts";

type Row = {
  week: number;
  season: number;
  passYds: number;
  rushYds: number;
  recYds: number;
  passTd?: number;
  ints?: number;
};

type Metric = "passYds" | "rushYds" | "recYds" | "passTd" | "ints";

type Props = {
  data: Row[];
  metric: Metric;
  title: string;
  barFill?: string; // base color
  propLine?: number | null; // threshold
  hitFill?: string; // color when >= propLine
  filterHits?: boolean; // show only hit weeks
  forecastMap?: Record<number, number>; // week -> predicted value
};

export default function MetricBarChart({
  data,
  metric,
  title,
  barFill = "#3b82f6",
  propLine = null,
  hitFill = "#16a34a",
  filterHits = false,
  forecastMap,
}: Props) {
  const labelFormatter = (_: any, payload: ReadonlyArray<any>) => {
    const p = payload?.[0]?.payload as Row | undefined;
    return p ? `Season ${p.season} · Week ${p.week}` : "Week";
  };

  const hasLine = typeof propLine === "number" && !Number.isNaN(propLine);

  const baseData = data.map((row) => ({
    ...row,
    predicted: forecastMap ? forecastMap[row.week] ?? null : null,
  }));

  const filteredData =
    filterHits && hasLine
      ? baseData.filter((row) => {
          const v = (row as any)[metric] as number | undefined;
          return typeof v === "number" && v >= (propLine as number);
        })
      : baseData;

  if (filteredData.length === 0) {
    return (
      <div className="h-80 w-full">
        <div className="mb-2 text-sm font-medium text-slate-600">{title}</div>
        <div className="flex h-[calc(100%-1.75rem)] items-center justify-center rounded-lg border bg-white text-sm text-slate-500">
          {hasLine
            ? "No weeks met or exceeded the line."
            : "Enter a prop line to filter hit weeks."}
        </div>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <div className="mb-2 text-sm font-medium text-slate-600">{title}</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={filteredData}
          margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tickFormatter={(w) => `W${w}`} />
          <YAxis />
          <Tooltip labelFormatter={labelFormatter} />
          <Legend />
          {hasLine && (
            <ReferenceLine
              y={propLine as number}
              stroke="#0ea5e9"
              strokeDasharray="6 6"
              ifOverflow="extendDomain"
              label={{
                value: `Line: ${propLine}`,
                position: "right",
                fill: "#0ea5e9",
                fontSize: 12,
              }}
            />
          )}

          <Bar dataKey={metric} name={title}>
            {filteredData.map((row, i) => {
              const v = (row as any)[metric] as number | undefined;
              const hit =
                hasLine && typeof v === "number" && v >= (propLine as number);
              return <Cell key={`cell-${i}`} fill={hit ? hitFill : barFill} />;
            })}
          </Bar>

          {/* Predicted overlay (if any) */}
          <Line
            type="monotone"
            dataKey="predicted"
            name="Predicted"
            dot={false}
            stroke="#0ea5e9"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
