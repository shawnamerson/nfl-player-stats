// components/QBCharts.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
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

// Chart margins used for pixel <-> value mapping
const MARGINS = { top: 6, right: 10, bottom: 6, left: 0 };

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

export default function QBCharts({ data, height = 280 }: Props) {
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

/* ---------------- Card with draggable/tap-to-set prop line ---------------- */

function ChartCard({
  title,
  data,
  height,
}: {
  title: string;
  data: Point[];
  height: number;
}) {
  // Decide if this metric is integer-like (snap line to whole numbers)
  const integerMetric = useMemo(() => {
    const t = title.toLowerCase();
    return /attempts|completions|yards|tds?|interceptions|sacks|long/.test(t);
  }, [title]);

  // Compute domain + a touch of headroom
  const { min, max } = useMemo(() => {
    const vals = data.map((d) => d.value);
    const dmin = Math.min(...vals);
    const dmax = Math.max(...vals);
    if (!Number.isFinite(dmin) || !Number.isFinite(dmax))
      return { min: 0, max: 1 };
    const pad = Math.max(1, (dmax - dmin) * 0.08);
    return { min: dmin - pad, max: dmax + pad };
  }, [data]);

  // Start centered so the line is visible immediately
  const [line, setLine] = useState<number | null>((min + max) / 2);

  // Formatter & snap
  const snap = (v: number) =>
    integerMetric ? Math.round(v) : Math.round(v * 10) / 10;
  const display = (v: number | null) =>
    v === null
      ? ""
      : integerMetric
      ? String(Math.round(v))
      : (Math.round(v * 10) / 10).toFixed(1);

  const { hits, pct } = useMemo(() => {
    if (line === null || data.length === 0) return { hits: 0, pct: 0 };
    const h = data.filter((d) => d.value > line).length; // strictly over
    return { hits: h, pct: Math.round((h / data.length) * 100) };
  }, [line, data]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 px-3 pt-3 pb-2">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="flex items-center gap-2">
          {line !== null && (
            <>
              <span
                className="rounded-md px-2 py-1 text-[11px] font-semibold"
                style={{
                  color: LIME,
                  border: `1px solid ${LIME}`,
                  background: "rgba(163,230,53,.06)",
                }}
                title="Hit weeks / total (strictly over the line)"
              >
                LINE {display(line)} • HIT {hits}/{data.length} • {pct}%
              </span>
            </>
          )}
          <button
            onClick={() => setLine(null)}
            className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-500"
            title="Clear prop line"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Chart fills card on mobile via aspect-ratio; fixed height ≥ sm */}
      <div className="relative w-full aspect-[16/12] sm:aspect-auto sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={MARGINS}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="week"
              stroke={HOT_PINK}
              tick={{ fill: HOT_PINK, fontSize: 11 }}
              tickLine={{ stroke: HOT_PINK }}
              axisLine={{ stroke: HOT_PINK }}
            />
            <YAxis
              domain={[min, max]}
              mirror
              tickMargin={2}
              width={36}
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

        {/* 1) Tap anywhere to create/position the line */}
        <TapToSetOverlay
          onSet={(v) => setLine((cur) => snap(v))}
          domain={{ min, max }}
          margins={MARGINS}
        />

        {/* 2) Drag the line or handle to move it */}
        <DraggableLine
          value={line}
          onChange={(v) => setLine(v === null ? null : snap(v))}
          domain={{ min, max }}
          margins={MARGINS}
          displayValue={display(line)}
        />
      </div>
    </div>
  );
}

/* --------------- Tap-to-set overlay (full chart area) --------------- */
function TapToSetOverlay({
  onSet,
  domain,
  margins,
}: {
  onSet: (value: number) => void;
  domain: { min: number; max: number };
  margins: { top: number; right: number; bottom: number; left: number };
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const yToValue = (y: number, h: number) => {
    const plotH = Math.max(1, h - margins.top - margins.bottom);
    const yClamped = Math.min(h - margins.bottom, Math.max(margins.top, y));
    const t = (yClamped - margins.top) / plotH; // 0 at top, 1 at bottom
    const v = domain.max - t * (domain.max - domain.min);
    return Math.max(domain.min, Math.min(domain.max, v));
  };

  const handle = (clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = clientY - rect.top;
    onSet(yToValue(y, rect.height));
  };

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-10"
      // Make it transparent but interactive
      style={{ background: "transparent" }}
      onMouseDown={(e) => handle(e.clientY)}
      onTouchStart={(e) => handle(e.touches[0]?.clientY ?? 0)}
    />
  );
}

/* --------------- Draggable overlay (line + handle + value bubble) --------------- */
function DraggableLine({
  value,
  onChange,
  domain,
  margins,
  displayValue,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  domain: { min: number; max: number };
  margins: { top: number; right: number; bottom: number; left: number };
  displayValue: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);

  const yToValue = (y: number, h: number) => {
    const plotH = Math.max(1, h - margins.top - margins.bottom);
    const yClamped = Math.min(h - margins.bottom, Math.max(margins.top, y));
    const t = (yClamped - margins.top) / plotH;
    const v = domain.max - t * (domain.max - domain.min);
    return Math.max(domain.min, Math.min(domain.max, v));
  };

  const valueToY = (v: number, h: number) => {
    const plotH = Math.max(1, h - margins.top - margins.bottom);
    const t = (domain.max - v) / (domain.max - domain.min || 1);
    return margins.top + t * plotH;
  };

  const startDrag = (clientY: number) => {
    const el = ref.current;
    if (!el) return;
    draggingRef.current = true;
    const rect = el.getBoundingClientRect();
    const y = clientY - rect.top;
    onChange(yToValue(y, rect.height));
  };

  const moveDrag = (clientY: number) => {
    if (!draggingRef.current) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = clientY - rect.top;
    onChange(yToValue(y, rect.height));
  };

  const stopDrag = () => {
    draggingRef.current = false;
  };

  // Compute current Y for positioning (when ref is available)
  let lineTop = 0;
  if (value !== null && ref.current) {
    const h = ref.current.getBoundingClientRect().height;
    lineTop = valueToY(value, h);
  }

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 z-20"
      // Mouse
      onMouseMove={(e) => moveDrag(e.clientY)}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      // Touch
      onTouchMove={(e) => moveDrag(e.touches[0]?.clientY ?? 0)}
      onTouchEnd={stopDrag}
      onTouchCancel={stopDrag}
    >
      {value !== null && (
        <div
          className="absolute left-0 right-0"
          style={{ top: `${lineTop}px` }}
        >
          {/* Interactive strip around the line */}
          <div className="relative pointer-events-auto -translate-y-1/2 h-8">
            {/* Drag-anywhere zone on the line */}
            <div
              className="absolute left-0 right-10 top-0 bottom-0 cursor-grab"
              onMouseDown={(e) => {
                e.preventDefault();
                startDrag(e.clientY);
              }}
              onTouchStart={(e) => {
                startDrag(e.touches[0]?.clientY ?? 0);
              }}
              aria-hidden
            />
            {/* Visible line */}
            <div
              className="absolute left-0 right-10 top-1/2 h-0.5"
              style={{ background: LIME, opacity: 0.95 }}
            />

            {/* Value bubble near the handle */}
            <div className="absolute right-10 -top-6">
              <div
                className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  color: LIME,
                  borderColor: LIME,
                  background: "rgba(163,230,53,.08)",
                }}
              >
                {displayValue}
              </div>
            </div>

            {/* Handle on the right */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 touch-none select-none">
              <button
                type="button"
                aria-label="Drag prop line"
                className="h-6 w-6 cursor-grab rounded-full border border-lime-400 bg-black text-[10px] font-semibold text-lime-300 active:cursor-grabbing"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startDrag(e.clientY);
                }}
                onTouchStart={(e) => {
                  startDrag(e.touches[0]?.clientY ?? 0);
                }}
              >
                ≡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
