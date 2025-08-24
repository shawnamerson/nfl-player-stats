"use client";

import { useEffect, useMemo, useState } from "react";

type MetricKey = "passYds" | "rushYds" | "recYds";

const METRIC_LABEL: Record<MetricKey, string> = {
  passYds: "Pass Yards",
  rushYds: "Rush Yards",
  recYds: "Receiving Yards",
};

type Props = {
  playerId: string;
  playerKey: string; // same key used for prop lines storage
  defaultSeason: number; // e.g., latest season from this player's games
  teams: string[]; // list from defense_stats
  metricsShown: MetricKey[]; // which metrics to evaluate against prop lines
};

type ApiResp = {
  passYds: number | null;
  rushYds: number | null;
  recYds: number | null;
  components?: any;
  error?: string;
};

export default function WhatIfPredictor({
  playerId,
  playerKey,
  defaultSeason,
  teams,
  metricsShown,
}: Props) {
  const [season, setSeason] = useState<number>(defaultSeason);
  const [week, setWeek] = useState<number>(5);
  const [team, setTeam] = useState<string>(teams[0] ?? "");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ApiResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read prop lines saved by PlayerChartsClient
  const linesKey = useMemo(() => `propLines:${playerKey}`, [playerKey]);
  const [lines, setLines] = useState<Record<string, number | null>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(linesKey);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
  }, [linesKey]);

  const doPredict = async () => {
    setError(null);
    setLoading(true);
    setResp(null);
    try {
      const r = await fetch("/api/whatif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, teamAbbr: team, season, week }),
      });
      const json: ApiResp = await r.json();
      if (!r.ok || json.error) {
        setError(json.error || "Request failed");
      } else {
        setResp(json);
      }
    } catch (e: any) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const items = [
    {
      key: "passYds" as MetricKey,
      value: resp?.passYds ?? null,
      line: (lines as any)?.passYds ?? null,
      hit: null,
    },
    {
      key: "rushYds" as MetricKey,
      value: resp?.rushYds ?? null,
      line: (lines as any)?.rushYds ?? null,
      hit: null,
    },
    {
      key: "recYds" as MetricKey,
      value: resp?.recYds ?? null,
      line: (lines as any)?.recYds ?? null,
      hit: null,
    },
  ]
    .filter((i) => metricsShown.includes(i.key))
    .map((i) => ({
      ...i,
      hit: i.value != null && i.line != null ? i.value >= i.line : null,
    }));

  return (
    <section className="rounded-2xl border bg-white p-4 shadow">
      <h2 className="mb-3 text-lg font-medium">What-If vs Defense</h2>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="flex items-center gap-2">
          <label className="w-20 text-sm text-slate-600">Season</label>
          <input
            type="number"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-1.5 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="w-20 text-sm text-slate-600">Week</label>
          <input
            type="number"
            value={week}
            min={1}
            max={22}
            onChange={(e) => setWeek(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-1.5 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 md:col-span-2">
          <label className="w-20 text-sm text-slate-600">Defense</label>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="w-full rounded-lg border px-3 py-1.5 text-sm"
          >
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={doPredict}
        disabled={loading || !team}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Predicting…" : "Predict"}
      </button>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {resp && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {items.map((i) => (
            <div key={i.key} className="rounded-xl border p-3">
              <div className="text-sm font-medium">{METRIC_LABEL[i.key]}</div>
              <div className="mt-1 text-2xl font-semibold">
                {i.value == null ? "—" : Math.round(i.value)}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Line: {i.line == null ? "—" : i.line}
              </div>
              <div className="mt-2">
                {i.line == null || i.value == null ? (
                  <span className="text-xs text-slate-500">
                    Set a line above to see hit/miss.
                  </span>
                ) : i.hit ? (
                  <span className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-800">
                    Hit
                  </span>
                ) : (
                  <span className="rounded-md bg-red-100 px-2 py-1 text-xs text-red-800">
                    Miss
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
