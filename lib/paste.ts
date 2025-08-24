// lib/paste.ts

export type QbCsvRow = {
  date: string;
  opp_abbr: string;
  result: string | null;
  pass_att: number | null;
  pass_cmp: number | null;
  pass_yds: number | null;
  pass_td: number | null;
  interceptions: number | null;
  pass_cmp_pct: number | null;
  pass_ypa: number | null;
  pass_long: number | null;
  sacks: number | null;
  passer_rating: number | null;
  qbr: number | null;
  rush_att: number | null;
  rush_yds: number | null;
  rush_td: number | null;
  rush_long: number | null;
};

export function toNumberOrNull(x: string | undefined): number | null {
  if (x === undefined) return null;
  const t = x.trim();
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseQbCsvLine(cols: string[]): QbCsvRow {
  const g = (i: number) => cols[i]?.trim() ?? "";
  return {
    date: g(0),
    opp_abbr: g(1),
    result: g(2) || null,
    pass_att: toNumberOrNull(g(3)),
    pass_cmp: toNumberOrNull(g(4)),
    pass_yds: toNumberOrNull(g(5)),
    pass_td: toNumberOrNull(g(6)),
    interceptions: toNumberOrNull(g(7)),
    pass_cmp_pct: toNumberOrNull(g(8)),
    pass_ypa: toNumberOrNull(g(9)),
    pass_long: toNumberOrNull(g(10)),
    sacks: toNumberOrNull(g(11)),
    passer_rating: toNumberOrNull(g(12)),
    qbr: toNumberOrNull(g(13)),
    rush_att: toNumberOrNull(g(14)),
    rush_yds: toNumberOrNull(g(15)),
    rush_td: toNumberOrNull(g(16)),
    rush_long: toNumberOrNull(g(17)),
  };
}
