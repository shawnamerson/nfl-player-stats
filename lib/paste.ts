// lib/paste.ts
// Paste parser for an ESPN gamelog single-row paste.
// Works for rows with headers like: CMP ATT YDS ... RTG QBR  / CAR YDS AVG TD LNG

export type ParsedPaste = {
  opponent: string | null;   // e.g. "@ PIT"
  opp_abbr: string | null;   // e.g. "PIT"
  pass_yds: number;
  pass_td: number;
  interceptions: number;
  rush_yds: number;
};

const TEAM_ABBRS = new Set([
  "ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN","DET","GB",
  "HOU","IND","JAX","KC","LV","LAC","LAR","MIA","MIN","NE","NO","NYG","NYJ",
  "PHI","PIT","SEA","SF","TB","TEN","WSH"
]);

function toNum(x: any): number {
  if (x == null) return 0;
  const n = Number(String(x).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function findOpponent(text: string): { opponent: string | null; opp_abbr: string | null } {
  const t = text.replace(/\s+/g, " ").trim();

  // Look for "@ XXX" or "vs XXX"
  const m = t.match(/\b(@|vs\.?|v)\s*([A-Z]{2,4})\b/i);
  if (m) {
    const away = m[1].startsWith("@");
    const abbr = m[2].toUpperCase();
    if (TEAM_ABBRS.has(abbr)) {
      return { opponent: `${away ? "@" : "vs"} ${abbr}`, opp_abbr: abbr };
    }
  }

  // Fallback: just find a team abbr anywhere (first match wins)
  const m2 = t.match(/\b([A-Z]{2,4})\b/g);
  if (m2) {
    const abbr = m2.map(s => s.toUpperCase()).find(s => TEAM_ABBRS.has(s)) || null;
    if (abbr) return { opponent: `vs ${abbr}`, opp_abbr: abbr };
  }

  return { opponent: null, opp_abbr: null };
}

// Pull numbers that come *after* the passing header (ending at "QBR" or "RTG")
function extractNumbersAfterHeader(raw: string): number[] {
  const idxQBR = raw.lastIndexOf("QBR");
  const idxRTG = raw.lastIndexOf("RTG");
  const idxEnd = Math.max(idxQBR, idxRTG);

  const slice = idxEnd > -1 ? raw.slice(idxEnd + 3) : raw; // after label
  const nums = Array.from(slice.matchAll(/-?\d+(?:\.\d+)?/g)).map(m => toNum(m[0]));
  return nums;
}

export function parseEspnPaste(rawText: string): ParsedPaste {
  const { opponent, opp_abbr } = findOpponent(rawText);

  // Numbers come in this order typically:
  // PASS: CMP ATT YDS CMP% AVG TD INT LNG SACK RTG [QBR?]
  // RUSH: CAR YDS AVG TD LNG
  const nums = extractNumbersAfterHeader(rawText);

  // Figure out pass segment length (11 if no QBR, 12 if QBR included).
  // Heuristic: If we see at least 12 numbers before rushing, assume QBR present.
  // We'll default to 12 and fall back to 11 if total is too short.
  let passLen = 12;
  if (nums.length < 17) passLen = 11; // minimal case without QBR

  const pass = nums.slice(0, passLen);
  const rush = nums.slice(passLen);

  // Defensive indexing
  const pass_yds = toNum(pass[2]);       // YDS
  const pass_td = toNum(pass[5]);        // TD
  const interceptions = toNum(pass[6]);  // INT

  // Rush YDS is the 2nd number in the rush group: CAR (0), YDS (1)
  const rush_yds = toNum(rush[1]);

  return {
    opponent,
    opp_abbr,
    pass_yds,
    pass_td,
    interceptions,
    rush_yds,
  };
}
