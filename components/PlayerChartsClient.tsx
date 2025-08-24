"use client";

import { useEffect, useMemo, useState } from "react";
import MetricBarChart from "@/components/MetricBarChart";

type Row = {
  week: number;
  season: number;
  passYds: number;
  rushYds: number;
  recYds: number;
  passTd?: number;
  ints?: number;
};

type MetricKey = "passYds" | "rushYds" | "recYds" | "passTd" | "ints";

type ChartCfg = {
  metric: MetricKey;
  title: string;
  barFill: string;
  defaultLine?: number | null;
};

type Props = {
  data: Row[];
  charts: ChartCfg[];
  playerKey: string; // unique per player (e.g., player_id-position)
  forecasts?: Partial<Record<MetricKey, Record<number, number>>>; // week->pred
};

type LinesState = Record<MetricKey, number | null>;

function calcHitStats(data: Row[], metric: MetricKey, line: number | null) {
  const values = data
    .map((r) => (r as any)[metric] as number | undefined)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const total = values.length;
  if (total === 0 || typeof line !== "number" || Number.isNaN(line)) {
    return { hits: 0, total, pct: null as number | null };
  }
  const hits = values.reduce((acc, v) => (v >= line ? acc + 1 : acc), 0);
  const pct = Math.round((hits / total) * 100);
  return { hits, total, pct };
}

export default function PlayerChartsClient({
  data,
  charts,
  playerKey,
  forecasts,
}: Props) {
  const linesKey = useMemo(() => `propLines:${playerKey}`, [playerKey]);
  const settingsKey = useMemo(() => `propSettings:${playerKey}`, [playerKey]);

  const [lines, setLines] = useState<LinesState>({} as any);
  const [showOnlyHits, setShowOnlyHits] = useState(false);

  // Load saved lines + settings on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLines = localStorage.getItem(linesKey);
    if (savedLines) {
      try {
        setLines(JSON.parse(savedLines) as LinesState);
      } catch {}
    } else {
      const init: LinesState = {} as any;
      charts.forEach((c) => {
        init[c.metric] =
          typeof c.defaultLine === "number" ? c.defaultLine! : null;
      });
      setLines(init);
    }

    const savedSettings = localStorage.getItem(settingsKey);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as { showOnlyHits?: boolean };
        setShowOnlyHits(!!parsed.showOnlyHits);
      } catch {}
    }
  }, [charts, linesKey, settingsKey]);

  useEffect(() => {
    try {
      localStorage.setItem(linesKey, JSON.stringify(lines));
    } catch {}
  }, [lines, linesKey]);

  useEffect(() => {
    try {
      localStorage.setItem(settingsKey, JSON.stringify({ showOnlyHits }));
    } catch {}
  }, [showOnlyHits, settingsKey]);

  const setLine = (metric: MetricKey, value: string) => {
    const trimmed = value.trim();
    if (trimmed === "") {
      setLines((s) => ({ ...s, [metric]: null }));
      return;
    }
    const num = Number(trimmed);
    setLines((s) => ({
      ...s,
      [metric]: Number.isFinite(num) ? num : s?.[metric] ?? null,
    }));
  };

  const clearLine = (metric: MetricKey) =>
    setLines((s) => ({ ...s, [metric]: null }));

  const resetAll = () => {
    const init: LinesState = {} as any;
    charts.forEach((c) => {
      init[c.metric] =
        typeof c.defaultLine === "number" ? c.defaultLine! : null;
    });
    setLines(init);
  };

  // Summary header data
  const summaries = charts.map((c) => {
    const line = lines?.[c.metric] ?? null;
    const { hits, total, pct } = calcHitStats(data, c.metric, line);
    return {
      metric: c.metric,
      title: c.title,
      line,
      hits,
      total,
      pct,
      color: c.barFill,
    };
  });

  return (
    <div className="space-y-4">
      {/* Global controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white px-3 py-2">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={showOnlyHits}
            onChange={(e) => setShowOnlyHits(e.currentTarget.checked)}
          />
          <span>Show only hit weeks</span>
        </label>

        <button
          onClick={resetAll}
          className="rounded-lg border px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          title="Reset all prop lines"
        >
          Reset all lines
        </button>

        <span className="text-xs text-slate-500">
          Hit % uses all weeks with data; filtering only changes what’s shown.
        </span>
      </div>

      {/* Summary header */}
      <div className="rounded-xl border bg-white p-3">
        <div className="mb-2 text-sm font-medium text-slate-700">
          Prop Hit Summary
        </div>
        <div className="flex flex-wrap gap-2">
          {summaries.map((s) => (
            <div
              key={s.metric}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                s.line == null ? "opacity-60" : ""
              }`}
              style={{ borderColor: "rgba(0,0,0,0.08)" }}
              title={s.line == null ? "Set a line to compute hit %" : undefined}
            >
              <span className="font-medium">{s.title}</span>
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: s.color }}
              />
              <span>
                {s.pct == null
                  ? "Hit: —"
                  : `Hit: ${s.pct}% (${s.hits}/${s.total})`}
              </span>
              <span className="text-slate-500">
                {s.line == null ? "· Set line" : `· Line ${s.line}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div
        className={`grid gap-6 ${
          charts.length >= 3
            ? "grid-cols-1 lg:grid-cols-3"
            : "grid-cols-1 lg:grid-cols-2"
        }`}
      >
        {charts.map((c) => {
          const line = lines?.[c.metric] ?? null;
          return (
            <div key={c.metric} className="space-y-2">
              {/* Per-chart controls */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 shrink-0 w-28">
                  {c.title} Line
                </label>
                <input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Enter prop line (e.g. 250)"
                  value={line ?? ""}
                  onChange={(e) => setLine(c.metric, e.target.value)}
                />
                <button
                  onClick={() => clearLine(c.metric)}
                  className="rounded-lg border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  title="Clear line"
                >
                  Clear
                </button>
              </div>

              <MetricBarChart
                data={data}
                metric={c.metric}
                title={c.title}
                barFill={c.barFill}
                propLine={line}
                filterHits={showOnlyHits}
                forecastMap={forecasts?.[c.metric]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
