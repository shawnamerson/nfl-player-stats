// lib/definitions.ts
export type League = "nfl" | "cfb";

export type Player = {
  player_id: string;
  player_name: string;
  image_url: string | null;
  position: string | null;
  league: League;
  slug: string;
};

export type GameStat = {
  id: string;
  player_id: string;
  season: number;
  week: number;
  game_date: string | null;

  opponent: string | null;
  opp_abbr: string | null;

  // Passing
  pass_att: number | null;
  pass_cmp: number | null;
  pass_cmp_pct: number | null;
  pass_ypa: number | null;
  pass_long: number | null;
  pass_yds: number | null;
  pass_td: number | null;
  interceptions: number | null;
  sacks: number | null;
  passer_rating: number | null;
  qbr: number | null;

  // Rushing / Receiving (for completeness)
  rush_att: number | null;
  rush_yds: number | null;
  rush_td: number | null;
  rush_long: number | null;

  rec_yds: number | null;
};
