// scripts/seed.mjs
import { sql } from "@vercel/postgres";

async function main() {
  // Enable pgcrypto for gen_random_uuid()
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;

  // === Core tables ===
  await sql`
    CREATE TABLE IF NOT EXISTS players (
      player_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      player_name text NOT NULL,
      image_url text,
      position text,
      league text NOT NULL DEFAULT 'nfl' CHECK (league IN ('nfl')),
      slug varchar(190) UNIQUE NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS game_stats (
      id bigserial PRIMARY KEY,
      player_id uuid NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
      season int NOT NULL,
      week int NOT NULL,
      opponent text,            -- e.g. "vs BAL", "@ CIN"
      pass_yds int NOT NULL DEFAULT 0,
      rush_yds int NOT NULL DEFAULT 0,
      rec_yds int NOT NULL DEFAULT 0,
      pass_td int NOT NULL DEFAULT 0,
      interceptions int NOT NULL DEFAULT 0
    );
  `;

  // Opponent defense weekly allowances (simple demo metrics)
  await sql`
    CREATE TABLE IF NOT EXISTS defense_stats (
      id bigserial PRIMARY KEY,
      team_abbr text NOT NULL,   -- e.g. "BAL"
      season int NOT NULL,
      week int NOT NULL,
      pass_yds_allowed int NOT NULL DEFAULT 0,
      rush_yds_allowed int NOT NULL DEFAULT 0,
      rec_yds_allowed int NOT NULL DEFAULT 0
    );
  `;

  // Clear demo rows
  await sql`DELETE FROM game_stats;`;
  await sql`DELETE FROM players;`;
  await sql`DELETE FROM defense_stats;`;

  // === Players ===
  const { rows: p1 } = await sql/* sql */`
    INSERT INTO players (player_name, image_url, position, slug)
    VALUES ('Patrick Mahomes', NULL, 'QB', 'patrick-mahomes')
    RETURNING player_id;
  `;
  const mahomesId = p1[0].player_id;

  const { rows: p2 } = await sql/* sql */`
    INSERT INTO players (player_name, image_url, position, slug)
    VALUES ('Josh Allen', NULL, 'QB', 'josh-allen')
    RETURNING player_id;
  `;
  const allenId = p2[0].player_id;

  // === Minimal fake game logs (2024 Wk 1–4) ===
  const insertGame = (pid, s, w, opp, pass, rush, rec, td, ints) =>
    sql/* sql */`
      INSERT INTO game_stats (player_id, season, week, opponent, pass_yds, rush_yds, rec_yds, pass_td, interceptions)
      VALUES (${pid}::uuid, ${s}, ${w}, ${opp}, ${pass}, ${rush}, ${rec}, ${td}, ${ints});
    `;

  // Mahomes
  await insertGame(mahomesId, 2024, 1, 'vs BAL', 312, 24, 0, 2, 1);
  await insertGame(mahomesId, 2024, 2, '@ CIN', 285, 18, 0, 2, 0);
  await insertGame(mahomesId, 2024, 3, 'vs LAC', 348, 12, 0, 3, 1);
  await insertGame(mahomesId, 2024, 4, '@ LV', 299, 33, 0, 2, 0);

  // Allen
  await insertGame(allenId, 2024, 1, '@ MIA', 276, 45, 0, 2, 1);
  await insertGame(allenId, 2024, 2, 'vs NE', 334, 39, 0, 3, 2);
  await insertGame(allenId, 2024, 3, '@ NYJ', 301, 52, 0, 2, 0);
  await insertGame(allenId, 2024, 4, 'vs PIT', 267, 28, 0, 1, 0);

  // === Defense weekly allowances (FAKE demo values for the same weeks) ===
  // Teams we referenced above:
  // BAL, CIN, LAC, LV, MIA, NE, NYJ, PIT
  const insertDef = (team, s, w, pass, rush, rec) =>
    sql/* sql */`
      INSERT INTO defense_stats (team_abbr, season, week, pass_yds_allowed, rush_yds_allowed, rec_yds_allowed)
      VALUES (${team}, ${s}, ${w}, ${pass}, ${rush}, ${rec});
    `;

  const teams = ["BAL","CIN","LAC","LV","MIA","NE","NYJ","PIT"];
  for (const w of [1,2,3,4]) {
    // Totally made-up allowances, just to drive a demo
    await insertDef("BAL", 2024, w, 220 + 5*w, 95 + 2*w, 160 + 4*w);
    await insertDef("CIN", 2024, w, 245 + 3*w, 110 + 1*w, 175 + 2*w);
    await insertDef("LAC", 2024, w, 265 + 2*w, 102 + 2*w, 190 + 3*w);
    await insertDef("LV" , 2024, w, 255 + 1*w, 120 + 1*w, 185 + 2*w);
    await insertDef("MIA", 2024, w, 230 + 4*w, 100 + 2*w, 170 + 2*w);
    await insertDef("NE" , 2024, w, 215 + 2*w, 105 + 1*w, 155 + 3*w);
    await insertDef("NYJ", 2024, w, 205 + 3*w, 98  + 2*w, 150 + 2*w);
    await insertDef("PIT", 2024, w, 240 + 2*w, 112 + 2*w, 178 + 3*w);
  }

  console.log("Seed complete ✅");
}

main().catch((e) => { console.error(e); process.exit(1); });
