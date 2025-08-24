import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

type Body = {
  playerId?: string;
  teamAbbr?: string; // e.g., "NYJ"
  season?: number;   // e.g., 2024
  week?: number;     // e.g., 5  (prediction uses defense avg up to week-1)
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const playerId = body.playerId;
    const teamAbbr = (body.teamAbbr || "").toUpperCase();
    const season = Number(body.season);
    const week = Number(body.week);

    if (!playerId || !teamAbbr || !Number.isFinite(season) || !Number.isFinite(week) || week < 1) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Player game history up to the prior game (across all seasons up to season/week)
    const { rows: games } = await sql<{
      season: number; week: number; pass_yds: number; rush_yds: number; rec_yds: number;
    }>`
      SELECT season, week, pass_yds, rush_yds, rec_yds
      FROM game_stats
      WHERE player_id = ${playerId}::uuid
        AND (season < ${season} OR (season = ${season} AND week < ${week}))
      ORDER BY season ASC, week ASC
    `;

    const passHist = games.map(g => g.pass_yds);
    const rushHist = games.map(g => g.rush_yds);
    const recHist  = games.map(g => g.rec_yds);

    const trailingAvg = (arr: number[], n = 3) => {
      if (arr.length === 0) return null;
      const take = Math.min(n, arr.length);
      const s = arr.slice(-take);
      return s.reduce((a, b) => a + b, 0) / take;
    };

    const pMean = trailingAvg(passHist, 3);
    const rMean = trailingAvg(rushHist, 3);
    const rcMean= trailingAvg(recHist, 3);

    // Defense allowance up to prior week
    const { rows: d } = await sql<{ pass: number | null; rush: number | null; rec: number | null }>`
      SELECT
        AVG(pass_yds_allowed)::float AS pass,
        AVG(rush_yds_allowed)::float AS rush,
        AVG(rec_yds_allowed)::float  AS rec
      FROM defense_stats
      WHERE team_abbr = ${teamAbbr}
        AND season = ${season}
        AND week < ${week}
    `;
    const oppPass = d[0]?.pass ?? null;
    const oppRush = d[0]?.rush ?? null;
    const oppRec  = d[0]?.rec ?? null;

    const W_PLAYER = 0.6;
    const W_OPP    = 0.4;

    const predict = (a: number | null, b: number | null) =>
      a == null && b == null ? null : Math.round(W_PLAYER * (a ?? 0) + W_OPP * (b ?? 0));

    const result = {
      passYds: predict(pMean, oppPass),
      rushYds: predict(rMean, oppRush),
      recYds : predict(rcMean, oppRec),
      components: { pMean, rMean, rcMean, oppPass, oppRush, oppRec }, // for debugging/inspection
    };

    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
