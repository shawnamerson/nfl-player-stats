import { sql } from "@vercel/postgres";
import type { GameStat } from "./definitions";

function trailingAverage(nums: number[], count: number): number | null {
  if (nums.length === 0) return null;
  const take = Math.min(count, nums.length);
  const slice = nums.slice(-take);
  return slice.reduce((a, b) => a + b, 0) / take;
}

type PredRow = { season: number; week: number; predPass?: number | null; predRush?: number | null; predRec?: number | null };

export async function getPredictionsForPlayer(playerId: string): Promise<{
  passYds: Record<number, number>;
  rushYds: Record<number, number>;
  recYds:  Record<number, number>;
}> {
  const { rows: games } = await sql<GameStat>`
    SELECT id, player_id, season, week, opponent, opp_abbr, pass_yds, rush_yds, rec_yds, pass_td, interceptions
    FROM game_stats
    WHERE player_id = ${playerId}::uuid
    ORDER BY season ASC, week ASC
  `;

  const W_PLAYER = 0.6;
  const W_OPP    = 0.4;
  const N_TRAIL  = 3;

  const preds: PredRow[] = [];
  const passHist: number[] = [];
  const rushHist: number[] = [];
  const recHist : number[] = [];

  for (const g of games) {
    const pMean  = trailingAverage(passHist, N_TRAIL);
    const rMean  = trailingAverage(rushHist, N_TRAIL);
    const rcMean = trailingAverage(recHist, N_TRAIL);

    let oppPass: number | null = null;
    let oppRush: number | null = null;
    let oppRec : number | null = null;

    if (g.opp_abbr) {
      const { rows: o } = await sql<{ pass: number | null; rush: number | null; rec: number | null }>`
        SELECT
          AVG(pass_yds_allowed)::float  AS pass,
          AVG(rush_yds_allowed)::float  AS rush,
          AVG(rec_yds_allowed)::float   AS rec
        FROM defense_stats
        WHERE team_abbr = ${g.opp_abbr}
          AND season = ${g.season}
          AND week < ${g.week}
      `;
      oppPass = o[0]?.pass ?? null;
      oppRush = o[0]?.rush ?? null;
      oppRec  = o[0]?.rec  ?? null;
    }

    const predPass = pMean == null && oppPass == null ? null
      : (W_PLAYER * (pMean ?? 0)) + (W_OPP * (oppPass ?? 0));
    const predRush = rMean == null && oppRush == null ? null
      : (W_PLAYER * (rMean ?? 0)) + (W_OPP * (oppRush ?? 0));
    const predRec = rcMean == null && oppRec == null ? null
      : (W_PLAYER * (rcMean ?? 0)) + (W_OPP * (oppRec ?? 0));

    preds.push({
      season: g.season,
      week: g.week,
      predPass: predPass == null ? null : Math.round(predPass),
      predRush: predRush == null ? null : Math.round(predRush),
      predRec : predRec  == null ? null : Math.round(predRec),
    });

    passHist.push(g.pass_yds);
    rushHist.push(g.rush_yds);
    recHist.push(g.rec_yds);
  }

  const passYds: Record<number, number> = {};
  const rushYds: Record<number, number> = {};
  const recYds : Record<number, number> = {};
  for (const p of preds) {
    if (p.predPass != null) passYds[p.week] = p.predPass;
    if (p.predRush != null) rushYds[p.week] = p.predRush;
    if (p.predRec  != null) recYds[p.week]  = p.predRec;
  }
  return { passYds, rushYds, recYds };
}
