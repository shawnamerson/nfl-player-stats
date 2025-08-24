// app/api/whatif/route.ts
import { NextRequest, NextResponse } from "next/server";

type WhatIfInput = {
  statKey: string;         // e.g., "pass_yds"
  baseline: number;        // player per-game average
  oppDefense: number;      // opponent rank or allowed value
  adjustment?: number;     // optional manual tweak %
};

type WhatIfOutput = {
  projection: number;
  inputs: WhatIfInput;
  method: "baseline*adj";
};

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function parseInput(x: unknown): WhatIfInput {
  const obj = x as Record<string, unknown>;
  const statKey = typeof obj.statKey === "string" ? obj.statKey : "unknown";
  const baseline = isFiniteNumber(obj.baseline) ? obj.baseline : 0;
  const oppDefense = isFiniteNumber(obj.oppDefense) ? obj.oppDefense : 0;
  const adjustment = isFiniteNumber(obj.adjustment) ? obj.adjustment : undefined;
  return { statKey, baseline, oppDefense, adjustment };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = parseInput(body);

    // Simple defense-adjusted projection:
    // Treat oppDefense as a percentile (lower is better defense).
    // Convert to a factor ~ [0.85 .. 1.15] and apply optional user adjustment.
    const defenseFactor = input.oppDefense > 0
      ? 1.15 - Math.max(0, Math.min(100, input.oppDefense)) / 100 * 0.30
      : 1.0;
    const userAdj = input.adjustment ? (1 + input.adjustment / 100) : 1;

    const proj = input.baseline * defenseFactor * userAdj;

    const out: WhatIfOutput = {
      projection: Math.round(proj * 10) / 10,
      inputs: input,
      method: "baseline*adj",
    };

    return NextResponse.json(out, { status: 200 });
  } catch (_err) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}

export function GET() {
  return NextResponse.json({ ok: true });
}
