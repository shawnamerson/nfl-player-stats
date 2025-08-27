// lib/data.ts
import { sql } from "@/lib/db"; // ⬅️ use our wrapper
import type { Player, GameStat } from "./definitions";

export async function getPlayers(): Promise<Player[]> {
  const { rows } = await sql<Player>`
    SELECT player_id, player_name, image_url, position, league, slug
    FROM players
    WHERE league IN ('nfl', 'cfb')
    ORDER BY player_name ASC
  `;
  return rows;
}

export async function getPlayerBySlug(slug: string): Promise<Player | null> {
  const { rows } = await sql<Player>`
    SELECT player_id, player_name, image_url, position, league, slug
    FROM players
    WHERE slug = ${slug}::varchar
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getGameStatsForPlayer(playerId: string): Promise<GameStat[]> {
  const { rows } = await sql<GameStat>`
    SELECT id, player_id, week, season, opponent, opp_abbr, pass_yds, rush_yds, rec_yds, pass_td, interceptions
    FROM game_stats
    WHERE player_id = ${playerId}::uuid
    ORDER BY season ASC, week ASC
  `;
  return rows;
}

export async function getDefenseTeams(): Promise<string[]> {
  const { rows } = await sql<{ team_abbr: string }>`
    SELECT DISTINCT team_abbr
    FROM defense_stats
    ORDER BY team_abbr ASC
  `;
  return rows.map((r) => r.team_abbr);
}
