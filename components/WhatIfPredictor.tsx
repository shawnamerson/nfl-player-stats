// components/WhatIfPredictor.tsx
"use client";

import React, { useState } from "react";

type WhatIfInput = {
  statKey: string;
  baseline: number;
  oppDefense: number;
  adjustment?: number;
};

type WhatIfOutput = {
  projection: number;
  inputs: WhatIfInput;
  method: "baseline*adj";
};

export default function WhatIfPredictor() {
  const [statKey, setStatKey] = useState<string>("pass_yds");
  const [baseline, setBaseline] = useState<string>("250");
  const [opp, setOpp] = useState<string>("50");
  const [adj, setAdj] = useState<string>("0");
  const [result, setResult] = useState<WhatIfOutput | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  async function runPredict() {
    setLoading(true);
    setResult(null);
    const payload: WhatIfInput = {
      statKey,
      baseline: Number(baseline) || 0,
      oppDefense: Number(opp) || 0,
      adjustment: Number(adj) || 0,
    };
    const res = await fetch("/api/whatif", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as WhatIfOutput;
    setResult(json);
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-2 text-sm font-semibold">What-if Projection</div>
      <div className="flex flex-wrap items-end gap-2">
        <select
          value={statKey}
          onChange={(e) => setStatKey(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="pass_yds">Passing Yards</option>
          <option value="pass_td">Passing TDs</option>
          <option value="rush_yds">Rushing Yards</option>
        </select>
        <input
          className="w-24 rounded border px-2 py-1 text-sm"
          value={baseline}
          onChange={(e) => setBaseline(e.target.value)}
          placeholder="Baseline"
        />
        <input
          className="w-24 rounded border px-2 py-1 text-sm"
          value={opp}
          onChange={(e) => setOpp(e.target.value)}
          placeholder="Opp rank (1-100)"
        />
        <input
          className="w-24 rounded border px-2 py-1 text-sm"
          value={adj}
          onChange={(e) => setAdj(e.target.value)}
          placeholder="Adj % (±)"
        />
        <button
          onClick={runPredict}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
        >
          {loading ? "Calculating…" : "Run"}
        </button>
      </div>

      {result && (
        <div className="mt-3 text-sm">
          Projection: <b>{result.projection}</b> ({result.inputs.statKey})
        </div>
      )}
    </div>
  );
}
