export type Player = {
  player_id: string;
  player_name: string;
  image_url: string | null;
  position: string | null;
  league: "nfl" | "cfb";
  slug: string;
};

export type GameStat = {
  id: number;
  player_id: string;
  week: number;
  season: number;
  opponent: string | null;
  opp_abbr: string | null;
  pass_yds: number;
  rush_yds: number;
  rec_yds: number;
  pass_td: number;
  interceptions: number;
};

export type DefenseStat = {
  id: number;
  team_abbr: string;
  season: number;
  week: number;
  pass_yds_allowed: number;
  rush_yds_allowed: number;
  rec_yds_allowed: number;
};
