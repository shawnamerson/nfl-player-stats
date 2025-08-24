import { sql } from "@vercel/postgres";
import Link from "next/link";
import QBCharts from "@/components/QBCharts";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string }>;
};

export default async function PlayerDetail({ params, searchParams }: PageProps) {
  const { slug } = await params;                 // ✅ await params
  const sp = await searchParams;                 // ✅ await searchParams
  const seasonParam = Number(sp.season);

  const playerRes = await sql/* sql */`
    SELECT player_id, player_name, position
    FROM players
    WHERE slug = ${slug} AND league = 'nfl'
    LIMIT 1;
  `;
  const player = playerRes.rows[0];

  if (!player) {
    return (
      <main className="mx-auto max-w-3xl p-6 space-y-4">
        <p className="text-sm text-red-700">Player not found.</p>
        <Link className="text-sky-700 underline" href="/players">Back to players</Link>
      </main>
    );
  }

  const latestSeasonRes = await sql/* sql */`
    SELECT COALESCE(MAX(season), 0) AS latest
    FROM game_stats
    WHERE player_id = ${player.player_id}::uuid;
  `;
  const latestSeason = Number(latestSeasonRes.rows[0]?.latest || 0) || new Date().getFullYear();
  const season = Number.isFinite(seasonParam) && seasonParam > 0 ? seasonParam : latestSeason;

  const statsRes = await sql/* sql */`
    SELECT
      season, week, game_date, opponent, opp_abbr,
      pass_att, pass_cmp, pass_cmp_pct, pass_ypa, pass_long,
      pass_yds, pass_td, interceptions, sacks, passer_rating, qbr,
      rush_att, rush_yds, rush_td, rush_long
    FROM game_stats
    WHERE player_id = ${player.player_id}::uuid AND season = ${season}
    ORDER BY week ASC;
  `;
  const stats = statsRes.rows;

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {player.player_name} — {player.position ?? "?"}
          </h1>
          <p className="text-sm text-slate-600">Season {season} • {stats.length} games</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/players" className="rounded-lg border px-3 py-1.5 text-sm">← All players</Link>
          <form className="flex items-center gap-2" action={`/nfl/${encodeURIComponent(slug)}`}>
            <label className="text-sm text-slate-600" htmlFor="season">Season</label>
            <input
              id="season"
              name="season"
              defaultValue={season}
              className="w-24 rounded-lg border px-3 py-1.5 text-sm"
              type="number"
            />
            <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">Go</button>
          </form>
        </div>
      </header>

      {String(player.position).toUpperCase() === "QB" ? (
        stats.length ? (
          <QBCharts
            data={stats.map((r: any) => ({
              week: r.week,
              label: `W${r.week} ${r.opp_abbr ?? ""}`.trim(),
              opp: r.opp_abbr,
              game_date: r.game_date ?? null,
              pass_att: r.pass_att ?? 0,
              pass_cmp: r.pass_cmp ?? 0,
              pass_yds: r.pass_yds ?? 0,
              pass_td: r.pass_td ?? 0,
              interceptions: r.interceptions ?? 0,
              pass_long: r.pass_long ?? 0,
              sacks: r.sacks ?? 0,
              rush_att: r.rush_att ?? 0,
              rush_yds: r.rush_yds ?? 0,
              rush_td: r.rush_td ?? 0,
              rush_long: r.rush_long ?? 0,
            }))}
          />
        ) : (
          <p className="text-sm text-slate-600">No stats for season {season}.</p>
        )
      ) : (
        <p className="text-sm text-slate-600">
          Charts currently implemented for QBs. Detected position: <b>{player.position || "?"}</b>
        </p>
      )}
    </main>
  );
}
