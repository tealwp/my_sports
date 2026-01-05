export type LeagueName = "NHL" | "NFL" | "MLB" | "NBA" | "MLS";
export type SportType =
  | "hockey"
  | "football"
  | "baseball"
  | "basketball"
  | "soccer";

export type HockeyPosition = "L" | "R" | "C" | "D" | "G";
export type FootballPosition =
  | "QB"
  | "RB"
  | "WR"
  | "TE"
  | "K"
  | "DEF"
  | "OL"
  | "DL"
  | "LB"
  | "CB"
  | "S";
export type BaseballPosition =
  | "P"
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "LF"
  | "CF"
  | "RF"
  | "DH";
export type BasketballPosition = "PG" | "SG" | "SF" | "PF" | "C";
export type SoccerPosition = "GK" | "DEF" | "MID" | "FWD";
export type Position =
  | HockeyPosition
  | FootballPosition
  | BaseballPosition
  | BasketballPosition
  | SoccerPosition
  | "N/A";

export interface IStat {
  label: string;
  value: string | number;
}

export interface IGameLog {
  gameId: string;
  date: string;
  opponent: string;
  stats: IStat[];
}

export interface IPlayer {
  id: string;
  name: string;
  position: Position;
  number: string;
  stats: IStat[];
  headshotUrl?: string;
}

export interface ITeam {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl: string;
  wins: number;
  losses: number;
}

export interface ISportAdapter {
  leagueName: LeagueName;
  sportType: SportType;
  getTeams(): Promise<ITeam[]>;
  getTeamDetails(teamId: string): Promise<ITeam>;
  getPlayers(teamId: string): Promise<IPlayer[]>;
  getPlayerGames(playerId: string): Promise<IGameLog[]>;
}
