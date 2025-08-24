// scripts/paste-import.mjs
// ------------------------------------------------------------
// ESPN gamelog Paste → Parse → Insert (Postgres via @vercel/postgres)
// Robust to wrapped lines and "SACK 4-137" patterns, inserts:
// game_date, opponent, opp_abbr, pass_yds, rush_yds, rec_yds,
// pass_td, interceptions, pass_att, pass_cmp, pass_cmp_pct,
// pass_ypa, pass_long, sacks, passer_rating, qbr, rush_att.
// ------------------------------------------------------------

import { sql } from "@vercel/postgres";
import fs from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// ---------- args ----------
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

if (has("-h") || has("--help")) {
  console.log(`
Paste ESPN gamelog → Insert into game_stats

Options:
  --player "Name"        Search by player name (case-insensitive)
  --player-id UUID       Use exact player_id (skips search)
  --create               If --player has no matches, create the player
  --position QB          Position when creating (default: QB)
  --espn-id 3915511      Optional suffix for slug uniqueness when creating
  --season 2024          Season (required)
  --week 18              Week number (required)
  --file path.txt        Read pasted text from a file instead of prompting
  --dry                  Parse & preview only (no DB writes)
  --debug                Print parse internals

Example:
  node --env-file=.env.local scripts/paste-import.mjs --player "Joe Burrow" --position QB --create --espn-id 3915511 --season 2024 --week 18
`);
  process.exit(0);
}

// ---------- helpers (opponent/date/nums) ----------
const TEAM_ABBRS = new Set([
  "ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN","DET","GB",
  "HOU","IND","JAX","KC","LV","LAC","LAR","MIA","MIN","NE","NO","NYG","NYJ",
  "PHI","PIT","SEA","SF","TB","TEN","WSH"
]);

const toNum = (x) => {
  if (x == null) return 0;
  const n = Number(String(x).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function detectOpponent(raw) {
  const t = raw.replace(/\s+/g, " ").trim();
  const m = t.match(/\b(@|vs\.?|v)\s*([A-Z]{2,4})\b/i);
  if (m) {
    const away = m[1].startsWith("@");
    const abbr = m[2].toUpperCase();
    if (TEAM_ABBRS.has(abbr)) return { opponent: `${away ? "@" : "vs"} ${abbr}`, opp_abbr: abbr };
  }
  const caps = t.match(/\b([A-Z]{2,4})\b/g) || [];
  const abbr = caps.map((s) => s.toUpperCase()).find((s) => TEAM_ABBRS.has(s)) || null;
  if (abbr) return { opponent: `vs ${abbr}`, opp_abbr: abbr };
  return { opponent: null, opp_abbr: null };
}

// "Sat 1/4" → YYYY-MM-DD (Jan–Mar belong to season+1)
function detectGameDate(raw, season) {
  const m = raw.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b[^\d]*([0-1]?\d)\/([0-3]?\d)/i)
          || raw.match(/\b([0-1]?\d)\/([0-3]?\d)\b/);
  if (!m) return null;
  const mm = Number(m[m.length - 2]);
  const dd = Number(m[m.length - 1]);
  if (!mm || !dd) return null;
  const year = (mm <= 3) ? season + 1 : season;
  return `${year}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
}

function lineNumericTokens(line) {
  return Array.from(line.matchAll(/-?\d+(?:\.\d+)?/g)).map((m) => m[0]);
}

function sanitizeLines(raw) {
  const lines = raw.split(/\r?\n/);
  return lines.filter((l) => {
    const s = l.trim();
    if (!s) return false;
    if (/^\b(W|L|T)\b/i.test(s)) return false;             // W / L / T score lines
    if (/\b\d{1,2}\s*-\s*\d{1,2}\b/.test(s)) return false; // 19-17
    if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i.test(s)) return true; // keep date for detectGameDate
    if (/^@?\s*[A-Z]{2,4}$/.test(s)) return true;          // keep for opponent detection
    return true;
  });
}

function collectNumericPool(raw) {
  const clean = sanitizeLines(raw);
  const nums = [];
  for (const line of clean) {
    const t = lineNumericTokens(line);
    if (t.length) nums.push(...t.map(toNum));
  }
  // Remove "sack yards lost" like -137; keep values like -1 (valid for LNG/no-attempt)
  const normalized = nums.filter((n) => !(Number.isFinite(n) && n <= -50));
  return normalized;
}

// ---------- core finders ----------
function findPassCore(pool, debug) {
  // Find ATT YDS CMP% AVG TD INT (6 numbers) anywhere
  for (let i = 0; i + 6 <= pool.length; i++) {
    const [ATT, YDS, CMPpct, AVG, TD, INT] = pool.slice(i, i + 6);
    const ok =
      ATT >= 0 && ATT <= 80 &&
      YDS > -50 && YDS < 700 &&
      CMPpct >= 0 && CMPpct <= 100 &&
      AVG >= 0 && AVG <= 20 &&
      TD >= 0 && TD <= 10 &&
      INT >= 0 && INT <= 10;
    if (ok) return { idx: i, ATT, YDS, CMPpct, AVG, TD, INT };
  }
  if (debug) console.log("findPassCore: not found");
  return null;
}

function findPassTailBefore(pool, startIdx, hasQBR, debug) {
  // Look up to 8 numbers before startIdx for [LNG, SACK, RTG, (QBR?)]
  const left = Math.max(0, startIdx - 8);
  for (let i = startIdx - 1; i >= left; i--) {
    const LNG = pool[i - 3], SACK = pool[i - 2], RTG = pool[i - 1], QBR = pool[i];
    if (i - 3 < left) break;
    const ok =
      LNG >= -20 && LNG <= 99 &&
      SACK >= 0 && SACK <= 12 &&
      RTG >= 0 && RTG <= 160 &&
      (!hasQBR || (QBR >= 0 && QBR <= 100));
    if (ok) return { LNG, SACK, RTG, QBR: hasQBR ? QBR : null, endIdx: i };
  }
  if (debug) console.log("findPassTailBefore: not found");
  return { LNG: null, SACK: null, RTG: null, QBR: null, endIdx: left };
}

function guessCMP(pool, ATT, CMPpct, attIdx, debug) {
  // Try the value immediately before ATT (or 2 before) that makes CMP/ATT ~ CMP%
  const candidates = [];
  if (attIdx - 1 >= 0) candidates.push({ idx: attIdx - 1, val: pool[attIdx - 1] });
  if (attIdx - 2 >= 0) candidates.push({ idx: attIdx - 2, val: pool[attIdx - 2] });

  let best = { val: 0, err: Infinity };
  for (const c of candidates) {
    const cmp = c.val;
    if (!(cmp >= 0 && cmp <= 70)) continue;
    const pct = ATT ? (cmp / ATT) * 100 : 0;
    const err = Math.abs(pct - CMPpct);
    if (err < best.err) best = { val: cmp, err };
  }
  if (best.err < 3) return best.val; // within 3% points
  if (debug) console.log("guessCMP: fallback CMP=0");
  return 0;
}

function findRushBetween(pool, fromIdx, toIdx, debug) {
  // Search for CAR YDS AVG TD LNG between indices
  for (let i = fromIdx; i + 5 <= toIdx; i++) {
    const [CAR, RY, RAVG, RTD, RLNG] = pool.slice(i, i + 5);
    const ok =
      CAR >= 0 && CAR <= 30 &&
      RY > -250 && RY < 350 &&
      RAVG >= -5 && RAVG <= 30 &&
      RTD >= 0 && RTD <= 5 &&
      RLNG >= -50 && RLNG <= 99;
    if (ok) return { CAR, RY };
  }
  if (debug) console.log("findRushBetween: not found");
  return { CAR: 0, RY: 0 };
}

// ---------- parse ----------
function parseEspnPaste(raw, season, debug=false) {
  const { opponent, opp_abbr } = detectOpponent(raw);
  const game_date = detectGameDate(raw, season);
  const hasQBR = /\bQBR\b/i.test(raw);

  const pool = collectNumericPool(raw);
  if (debug) console.log("POOL:", pool.join(" "));

  const core = findPassCore(pool, debug);
  if (!core) throw new Error(`Couldn't locate pass core (ATT YDS CMP% AVG TD INT). Numbers seen=${pool.length}.`);

  // Pass tail just before the core
  const tail = findPassTailBefore(pool, core.idx, hasQBR, debug);

  // CMP guess (look just before ATT)
  const CMP = guessCMP(pool, core.ATT, core.CMPpct, core.idx, debug);

  // Rush block between tail end and core start
  const rush = findRushBetween(pool, Math.max(0, tail.endIdx + 1), core.idx, debug);

  // Map values
  const pass_cmp      = CMP;
  const pass_att      = core.ATT;
  const pass_yds      = core.YDS;
  const pass_cmp_pct  = core.CMPpct;
  const pass_ypa      = core.AVG;
  const pass_td       = core.TD;
  const interceptions = core.INT;
  const pass_long     = tail.LNG ?? 0;
  const sacks         = tail.SACK ?? 0;
  const passer_rating = tail.RTG ?? 0;
  const qbr           = hasQBR ? (tail.QBR ?? null) : null;

  const rush_att      = rush.CAR;
  const rush_yds      = rush.RY;
  const rec_yds       = 0;

  return {
    game_date, opponent, opp_abbr,
    pass_att, pass_cmp, pass_cmp_pct, pass_ypa, pass_long,
    sacks, passer_rating, qbr,
    pass_td, pass_yds, interceptions,
    rush_att, rush_yds, rec_yds
  };
}

// ---------- DB ----------
function slugify(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

async function searchPlayersByName(q) {
  const { rows } = await sql/* sql */`
    SELECT player_id, player_name, position, slug
    FROM players
    WHERE LOWER(player_name) LIKE ${"%" + q.toLowerCase() + "%"}
    ORDER BY player_name ASC
    LIMIT 20;
  `;
  return rows;
}

async function getPlayerById(id) {
  const { rows } = await sql/* sql */`
    SELECT player_id, player_name, position, slug
    FROM players
    WHERE player_id = ${id}::uuid
    LIMIT 1;
  `;
  return rows[0] || null;
}

async function createPlayerByName(name, position, espnId) {
  const league = "nfl";
  const slugBase = espnId ? `${slugify(name)}-${espnId}` : slugify(name);
  const { rows } = await sql/* sql */`
    INSERT INTO players (player_name, image_url, position, league, slug)
    VALUES (${name}, NULL, ${position}, ${league}, ${slugBase})
    ON CONFLICT (slug) DO UPDATE SET position = EXCLUDED.position
    RETURNING player_id, player_name, position, slug;
  `;
  return rows[0];
}

async function insertGameStats(player_id, season, week, p) {
  await sql/* sql */`
    DELETE FROM game_stats
    WHERE player_id = ${player_id}::uuid AND season = ${season} AND week = ${week};
  `;
  await sql/* sql */`
    INSERT INTO game_stats
      (player_id, season, week, game_date,
       opponent, opp_abbr,
       pass_att, pass_cmp, pass_cmp_pct, pass_ypa, pass_long,
       sacks, passer_rating, qbr,
       pass_td, pass_yds, interceptions,
       rush_att, rush_yds, rec_yds)
    VALUES
      (${player_id}::uuid, ${season}, ${week}, ${p.game_date},
       ${p.opponent}, ${p.opp_abbr},
       ${p.pass_att}, ${p.pass_cmp}, ${p.pass_cmp_pct}, ${p.pass_ypa}, ${p.pass_long},
       ${p.sacks}, ${p.passer_rating}, ${p.qbr},
       ${p.pass_td}, ${p.pass_yds}, ${p.interceptions},
       ${p.rush_att}, ${p.rush_yds}, ${p.rec_yds});
  `;
}

// ---------- main ----------
const season = Number(get("--season"));
const week = Number(get("--week"));
const playerIdArg = get("--player-id");
const playerNameArg = get("--player");
const fileArg = get("--file");
const dryRun = has("--dry");
const allowCreate = has("--create");
const createPosition = (get("--position") || "QB").toUpperCase();
const espnId = get("--espn-id");
const DEBUG = has("--debug");

if (!Number.isFinite(season) || !Number.isFinite(week)) {
  console.error("Error: --season and --week are required (numbers). Try --help for usage.");
  process.exit(1);
}

// Resolve player
let player = null;
if (playerIdArg) {
  player = await getPlayerById(playerIdArg);
  if (!player) { console.error(`No player found with player_id ${playerIdArg}`); process.exit(1); }
} else if (playerNameArg) {
  const matches = await searchPlayersByName(playerNameArg);
  if (matches.length === 0) {
    if (!allowCreate) { console.error(`No players matched "${playerNameArg}". Add --create --position QB [--espn-id 3915511] to auto-create.`); process.exit(1); }
    player = await createPlayerByName(playerNameArg, createPosition, espnId);
    console.log(`Created player: ${player.player_name} (${player.position}) — ${player.player_id}`);
  } else if (matches.length === 1) {
    player = matches[0];
  } else {
    console.log(`Multiple players matched "${playerNameArg}":`);
    matches.forEach((m, i) => console.log(`  [${i + 1}] ${m.player_name} (${m.position || "?"}) — ${m.player_id}`));
    const rlSel = createInterface({ input, output });
    const sel = await rlSel.question(`Choose 1-${matches.length}: `);
    await rlSel.close();
    const idx = Number(sel) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= matches.length) { console.error("Invalid selection."); process.exit(1); }
    player = matches[idx];
  }
} else {
  console.error("Provide --player \"Name\" (with optional --create) or --player-id UUID. Try --help for usage.");
  process.exit(1);
}

// Read paste
let rawText = "";
if (fileArg) {
  rawText = await fs.readFile(fileArg, "utf8");
} else {
  const rl = createInterface({ input, output });
  console.log("\nPaste the ESPN row (wrapped lines OK; include the date like 'Sat 1/4' if you have it).");
  console.log("When you're done, type a single line with: EOF  then press Enter.\n");
  const lines = [];
  while (true) {
    const line = await rl.question("");
    if (line.trim() === "EOF") break;
    lines.push(line);
  }
  await rl.close();
  rawText = lines.join("\n");
}
if (!rawText.trim()) { console.error("No text received."); process.exit(1); }

// Parse
let parsed;
try {
  parsed = parseEspnPaste(rawText, season, DEBUG);
} catch (e) {
  console.error("Parse error:", e?.message || e);
  if (!DEBUG) console.error("Tip: re-run with --debug to see the numeric pool I saw.");
  process.exit(1);
}

// Preview
console.log("\nParsed fields:");
console.table({
  game_date: parsed.game_date || "—",
  opponent: parsed.opponent || "—",
  opp_abbr: parsed.opp_abbr || "—",
  pass_cmp: parsed.pass_cmp,
  pass_att: parsed.pass_att,
  pass_yds: parsed.pass_yds,
  "CMP%": parsed.pass_cmp_pct,
  YPA: parsed.pass_ypa,
  TD: parsed.pass_td,
  INT: parsed.interceptions,
  LNG: parsed.pass_long,
  SACK: parsed.sacks,
  RTG: parsed.passer_rating,
  QBR: parsed.qbr ?? "—",
  "CAR": parsed.rush_att,
  "RUSH YDS": parsed.rush_yds,
  "REC YDS": parsed.rec_yds
});

if (dryRun) { console.log("\n--dry run: no DB changes.\n"); process.exit(0); }

// Confirm & insert
const rl2 = createInterface({ input, output });
const ans = await rl2.question(`\nInsert for ${player.player_name} (season ${season}, week ${week})? [y/N]: `);
await rl2.close();
if (!String(ans).trim().toLowerCase().startsWith("y")) { console.log("Aborted."); process.exit(0); }

await insertGameStats(player.player_id, season, week, parsed);
console.log("Inserted ✅");
