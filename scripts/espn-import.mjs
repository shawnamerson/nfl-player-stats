// scripts/espn-import.mjs
// ------------------------------------------------------------
// ESPN NFL importer (Core events + CDN boxscore -> Postgres)
// Robust: resolves missing week via summary, supports single-event debug.
// ------------------------------------------------------------

import { sql } from "@vercel/postgres";
import pLimit from "p-limit";

// ---------- CONFIG ----------
const SEASON = Number(process.env.SEASON || 2024);
const SEASONTYPE = Number(process.env.SEASONTYPE || 2); // 1=pre, 2=reg, 3=post
const POSITIONS = (process.env.POSITIONS || "QB,RB,WR,TE")
  .split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

const EVENT_ID = process.env.EVENT_ID || "";           // e.g., 401671626
const DEBUG = String(process.env.DEBUG || "").toLowerCase() === "1";

const CONCURRENCY = Number(process.env.CONCURRENCY || 6);
const SLEEP_MS = Number(process.env.SLEEP_MS || 150);

const limit = pLimit(CONCURRENCY);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- HTTP ----------
async function getJSON(url, opts = {}) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "nfl-player-stats/espn-import (personal project)",
      "Accept": "application/json",
    },
    ...opts,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} for ${url}\n${t.slice(0, 300)}`);
  }
  return r.json();
}

// ---------- ESPN endpoints ----------
async function fetchSeasonEvents(season, seasontype) {
  if (EVENT_ID) return [EVENT_ID]; // single-event mode
  const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${season}/types/${seasontype}/events?limit=1000`;
  const json = await getJSON(url);
  const items = Array.isArray(json?.items) ? json.items : [];
  const ids = items.map(it => {
    const ref = String(it?.$ref || it || "");
    const m = ref.match(/events\/(\d+)/);
    return m ? m[1] : null;
  }).filter(Boolean);
  return Array.from(new Set(ids));
}

async function fetchBoxscore(eventId) {
  const url = `https://cdn.espn.com/core/nfl/boxscore?xhr=1&gameId=${eventId}`;
  return getJSON(url);
}

async function fetchSummaryWeek(eventId) {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eventId}`;
    const j = await getJSON(url);
    const header = j?.header ?? {};
    const comp = Array.isArray(header?.competitions) ? header.competitions[0] : null;
    const w =
      Number(header?.week?.number) ||
      Number(comp?.week?.number) ||
      Number(header?.season?.type?.week) ||
      null;
    if (DEBUG) console.log(`event ${eventId}: summary-derived week=${w}`);
    return w;
  } catch (e) {
    if (DEBUG) console.log(`event ${eventId}: summary fetch failed`, e?.message || e);
    return null;
  }
}

// ---------- Helpers ----------
const coerceNum = (x) => {
  if (x == null) return 0;
  const n = Number(String(x).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function mapByLabels(labels = [], stats = []) {
  const out = {};
  const n = Math.max(labels.length, stats.length);
  for (let i = 0; i < n; i++) {
    const k = String(labels[i] ?? "").trim().toUpperCase();
    out[k] = stats[i] ?? null;
  }
  return out;
}

function pick(map, candidateKeys) {
  for (const k of candidateKeys) {
    if (map[k] != null) return map[k];
  }
  const keys = Object.keys(map);
  for (const want of candidateKeys) {
    const hit = keys.find((k) => k.includes(want));
    if (hit && map[hit] != null) return map[hit];
  }
  return null;
}

function isFinal(comp) {
  const t = comp?.status?.type ?? {};
  if (t.completed === true) return true;
  if (String(t.state || "").toLowerCase() === "post") return true;
  const name = String(t.name || "").toUpperCase();
  if (name === "STATUS_FINAL" || name === "STATUS_END_PERIOD") return true;
  if (/final/i.test(String(t.description || ""))) return true;
  return false;
}

// ---------- Parser ----------
function parseBoxscore(box, eventId) {
  const gp = box?.gamepackageJSON || {};
  const header = gp?.header || {};
  const comp = Array.isArray(header?.competitions) ? header.competitions[0] : null;

  const season = Number(header?.season?.year) || SEASON;
  let week =
    Number(header?.week?.number ?? comp?.week?.number ?? header?.season?.type?.week) || null;

  const playersGroups = Array.isArray(gp?.boxscore?.players) ? gp.boxscore.players : [];
  const hasPlayers = playersGroups.length > 0;
  const finalish = isFinal(comp);

  if (DEBUG) {
    console.log(`event ${eventId}: final=${finalish} hasPlayers=${hasPlayers} week=${week}`);
  }

  // teamId -> {abbr, homeAway}
  const teamMeta = new Map();
  for (const c of comp?.competitors || []) {
    const t = c?.team || {};
    if (!t?.id) continue;
    teamMeta.set(String(t.id), {
      id: String(t.id),
      abbr: t.abbreviation || null,
      homeAway: c.homeAway || null,
    });
  }

  const rows = [];

  // Primary path: boxscore.players[]
  for (const group of playersGroups) {
    const teamId = String(group?.team?.id || "");
    if (!teamId) continue;

    const me = teamMeta.get(teamId) || {};
    const opp = [...teamMeta.values()].find((x) => x.id !== teamId) || {};
    const opponent = opp.abbr ? `${me.homeAway === "home" ? "vs" : "@"} ${opp.abbr}` : null;
    const opp_abbr = opp.abbr || null;

    const cats = Array.isArray(group?.statistics) ? group.statistics : [];
    for (const cat of cats) {
      const catName = String(cat?.name || cat?.shortDisplayName || "").toLowerCase(); // "passing"|"rushing"|"receiving"
      const labels = Array.isArray(cat?.labels) ? cat.labels : [];
      const athletes = Array.isArray(cat?.athletes) ? cat.athletes : [];

      // Precompute index fallbacks if labels missing
      const passIdx = { YDS: -1, TD: -1, INT: -1 };
      if (!labels.length && catName.includes("pass")) {
        // Common ESPN order for passing: [C/ATT, YDS, TD, INT, ...]
        passIdx.YDS = 1; passIdx.TD = 2; passIdx.INT = 3;
      } else if (labels.length) {
        const up = labels.map((l) => String(l).trim().toUpperCase());
        passIdx.YDS = up.indexOf("YDS");
        passIdx.TD  = up.indexOf("TD");
        passIdx.INT = up.indexOf("INT");
      }

      for (const a of athletes) {
        const ath = a?.athlete || {};
        const athleteId = String(ath?.id || "");
        if (!athleteId) continue;

        const fullName = ath.displayName || ath.shortName || "Unknown";
        const position =
          (ath?.position?.abbreviation || ath?.position?.name || "").toUpperCase() || null;

        // Build or get unified row per (player, season)
        const key = `${athleteId}::${season}::${week ?? "NA"}`;
        let row = rows.find((r) => r._key === key);
        if (!row) {
          row = {
            _key: key,
            athleteId,
            fullName,
            position,
            teamId,
            opponent,
            opp_abbr,
            season,
            week: week, // might be null now; we will resolve later
            pass_yds: 0,
            pass_td: 0,
            interceptions: 0,
            rush_yds: 0,
            rec_yds: 0,
            sawAnyCat: false,
          };
          rows.push(row);
        }

        const statsArr = Array.isArray(a?.stats) ? a.stats : [];
        const byLabel = labels.length ? mapByLabels(labels, statsArr) : {};

        if (catName.includes("pass")) {
          let y = pick(byLabel, ["YDS", "YARDS", "YDS."]);
          let td = pick(byLabel, ["TD", "TDS"]);
          let it = pick(byLabel, ["INT", "INTS"]);

          // index fallback if labels absent
          if (y == null && passIdx.YDS >= 0) y = statsArr[passIdx.YDS];
          if (td == null && passIdx.TD >= 0) td = statsArr[passIdx.TD];
          if (it == null && passIdx.INT >= 0) it = statsArr[passIdx.INT];

          if (y != null) row.pass_yds = coerceNum(y);
          if (td != null) row.pass_td = coerceNum(td);
          if (it != null) row.interceptions = coerceNum(it);
          row.sawAnyCat = true;
        } else if (catName.includes("rush")) {
          let y = pick(byLabel, ["YDS", "YARDS", "YDS."]);
          if (y == null && statsArr.length >= 2) y = statsArr[1]; // [CAR, YDS, TD, LONG]
          if (y != null) row.rush_yds = coerceNum(y);
          row.sawAnyCat = true;
        } else if (catName.includes("receiv") || catName.includes("rec")) {
          let y = pick(byLabel, ["YDS", "YARDS", "YDS."]);
          if (y == null && statsArr.length >= 2) y = statsArr[1]; // [REC, YDS, TD, LONG]
          if (y != null) row.rec_yds = coerceNum(y);
          row.sawAnyCat = true;
        }
      }
    }
  }

  // Preview
  if (DEBUG) {
    const catsPreview = playersGroups?.[0]?.statistics?.map(s => s?.name || s?.shortDisplayName) || [];
    console.log(`event ${eventId}: parsedRows(pre-week)=${rows.length} cats[0]=${JSON.stringify(catsPreview)}`);
  }

  // Return even if week is null; caller will fix week if needed
  return { season, week, comp, rows };
}

// ---------- DB ----------
function slugify(name, id) {
  return `${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + id;
}

async function upsertPlayer({ athleteId, fullName, position }) {
  const slug = slugify(fullName, athleteId);
  const pos = position || null;
  const { rows } = await sql/* sql */`
    INSERT INTO players (player_name, image_url, position, league, slug)
    VALUES (${fullName}, NULL, ${pos}, 'nfl', ${slug})
    ON CONFLICT (slug) DO UPDATE SET position = EXCLUDED.position
    RETURNING player_id;
  `;
  return rows[0].player_id;
}

async function insertGameStat(player_id, row) {
  await sql/* sql */`
    DELETE FROM game_stats
    WHERE player_id = ${player_id}::uuid
      AND season = ${row.season}
      AND week   = ${row.week};
  `;
  await sql/* sql */`
    INSERT INTO game_stats
      (player_id, season, week, opponent, opp_abbr, pass_yds, rush_yds, rec_yds, pass_td, interceptions)
    VALUES
      (${player_id}::uuid, ${row.season}, ${row.week}, ${row.opponent}, ${row.opp_abbr},
       ${row.pass_yds || 0}, ${row.rush_yds || 0}, ${row.rec_yds || 0}, ${row.pass_td || 0}, ${row.interceptions || 0});
  `;
}

// ---------- MAIN ----------
async function main() {
  console.log(`ESPN import (Core+CDN players): season=${SEASON} seasontype=${SEASONTYPE}`);
  if (EVENT_ID) console.log(`Single-event mode: ${EVENT_ID}`);
  if (DEBUG) console.log("DEBUG mode on");

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS ux_game ON game_stats (player_id, season, week);`;

  const eventIds = await fetchSeasonEvents(SEASON, SEASONTYPE);
  console.log(`Events to scan: ${eventIds.length}`);

  let finalsProcessed = 0;
  let rowsInserted = 0;

  const tasks = eventIds.map((eid) =>
    limit(async () => {
      try {
        await sleep(SLEEP_MS);
        const box = await fetchBoxscore(eid);
        let { season, week, comp, rows } = parseBoxscore(box, eid);

        // If week missing, resolve from summary
        if (!Number.isFinite(week) || week == null) {
          week = await fetchSummaryWeek(eid);
          if (week != null) {
            for (const r of rows) r.week = week;
          }
        }

        // Gate: must have rows, and week must be known
        if (!rows.length || !Number.isFinite(week)) {
          if (DEBUG) console.log(`event ${eid}: skip (rows=${rows.length}, week=${week})`);
          return;
        }

        finalsProcessed++;

        for (const r of rows) {
          // Optional: filter by position
          if (r.position && POSITIONS.length && !POSITIONS.includes(r.position)) continue;

          const player_id = await upsertPlayer({
            athleteId: r.athleteId,
            fullName: r.fullName,
            position: r.position,
          });

          await insertGameStat(player_id, r);
          rowsInserted++;
        }
      } catch (err) {
        console.error(`Event ${eid} failed:`, err.message || err);
      }
    })
  );

  await Promise.allSettled(tasks);
  console.log(`Done. finals processed: ${finalsProcessed}, rows inserted: ${rowsInserted}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
