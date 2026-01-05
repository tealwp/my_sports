import type {
  ISportAdapter,
  ITeam,
  IPlayer,
  IStat,
  IGameLog,
  HockeyPosition,
  Position,
} from "../types";

// NHL API Response Interfaces
interface NHLStandingsResponse {
  standings: Array<{
    teamName: { default: string };
    teamAbbrev: { default: string };
    teamLogo: string;
    wins: number;
    losses: number;
  }>;
}

interface NHLPlayerStat {
  playerId: number;
  headshot: string;
  firstName: { default: string };
  lastName: { default: string };
  sweaterNumber?: number;
  positionCode: string;
  goals?: number;
  assists?: number;
  points?: number;
  plusMinus?: number;
  gamesPlayed?: number;
  wins?: number;
  losses?: number;
  shutouts?: number;
  savePercentage?: number;
  goalsAgainstAverage?: number;
}

interface NHLClubStatsResponse {
  skaters: NHLPlayerStat[];
  goalies: NHLPlayerStat[];
}

interface NHLRosterPlayer {
  id: number;
  sweaterNumber: number;
}

interface NHLRosterResponse {
  forwards: NHLRosterPlayer[];
  defensemen: NHLRosterPlayer[];
  goalies: NHLRosterPlayer[];
}

interface NHLGameLog {
  gameId: number;
  gameDate: string;
  opponentAbbrev: string;
  homeRoadFlag: string; // "H" or "R"
  goals?: number;
  assists?: number;
  points?: number;
  plusMinus?: number;
  toi?: string;
  // Goalie specific
  savePctg?: number;
  goalsAgainst?: number;
  shotsAgainst?: number;
  decision?: string; // "W", "L", "O"
}

interface NHLGameLogResponse {
  gameLog: NHLGameLog[];
}

const BASE_URL = "/api/nhl";

export const nhlAdapter: ISportAdapter = {
  leagueName: "NHL",
  sportType: "hockey",

  getTeams: async (): Promise<ITeam[]> => {
    const response = await fetch(`${BASE_URL}/standings/now`);
    if (!response.ok)
      throw new Error(`Failed to fetch standings: ${response.statusText}`);
    const data = (await response.json()) as NHLStandingsResponse;

    return data.standings.map((t) => ({
      id: t.teamAbbrev.default, // Use Abbreviation (e.g. "NJD") as ID
      name: t.teamName.default,
      abbreviation: t.teamAbbrev.default,
      logoUrl: t.teamLogo,
      wins: t.wins,
      losses: t.losses,
    }));
  },

  getTeamDetails: async (teamId: string): Promise<ITeam> => {
    // Reuse getTeams because the NHL API doesn't have a lightweight "team info" endpoint
    const teams = await nhlAdapter.getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) throw new Error(`Team ${teamId} not found`);
    return team;
  },

  getPlayers: async (teamId: string): Promise<IPlayer[]> => {
    const [statsResponse, rosterResponse] = await Promise.all([
      fetch(`${BASE_URL}/club-stats/${teamId}/now`),
      fetch(`${BASE_URL}/roster/${teamId}/current`),
    ]);

    if (!statsResponse.ok)
      throw new Error(`Failed to fetch roster: ${statsResponse.statusText}`);

    const data = (await statsResponse.json()) as NHLClubStatsResponse;
    const numberMap = new Map<number, number>();

    if (rosterResponse.ok) {
      const rosterData = (await rosterResponse.json()) as NHLRosterResponse;
      const allPlayers = [
        ...(rosterData.forwards || []),
        ...(rosterData.defensemen || []),
        ...(rosterData.goalies || []),
      ];
      allPlayers.forEach((p) => numberMap.set(p.id, p.sweaterNumber));
    }

    const mapPlayer = (p: NHLPlayerStat): IPlayer => {
      const stats: IStat[] = [];

      if (p.positionCode === "G") {
        if (p.gamesPlayed !== undefined)
          stats.push({ label: "GP", value: p.gamesPlayed });
        if (p.wins !== undefined) stats.push({ label: "W", value: p.wins });
        if (p.losses !== undefined) stats.push({ label: "L", value: p.losses });
        if (p.savePercentage !== undefined)
          stats.push({ label: "SV%", value: p.savePercentage.toFixed(3) });
        if (p.goalsAgainstAverage !== undefined)
          stats.push({ label: "GAA", value: p.goalsAgainstAverage.toFixed(2) });
        if (p.shutouts !== undefined)
          stats.push({ label: "SO", value: p.shutouts });
      } else {
        if (p.gamesPlayed !== undefined)
          stats.push({ label: "GP", value: p.gamesPlayed });
        if (p.goals !== undefined) stats.push({ label: "G", value: p.goals });
        if (p.assists !== undefined)
          stats.push({ label: "A", value: p.assists });
        if (p.points !== undefined) stats.push({ label: "P", value: p.points });
        if (p.plusMinus !== undefined)
          stats.push({
            label: "+/-",
            value: p.plusMinus > 0 ? `+${p.plusMinus}` : p.plusMinus,
          });
      }

      return {
        id: p.playerId.toString(),
        name: `${p.firstName.default} ${p.lastName.default}`,
        position: getNHLPositionFullName(p.positionCode),
        number: numberMap.get(p.playerId)?.toString() ?? "",
        headshotUrl: p.headshot,
        stats,
      };
    };

    const getStatValue = (player: IPlayer, key: string): number => {
      const stat = player.stats.find((s) => s.label === key);
      return stat ? Number(stat.value) : 0;
    };

    const skaters = data.skaters.map(mapPlayer).sort((a, b) => {
      // Sort by Points (P) descending, then Goals (G)
      const pointsDiff = getStatValue(b, "P") - getStatValue(a, "P");
      if (pointsDiff !== 0) return pointsDiff;
      return getStatValue(b, "G") - getStatValue(a, "G");
    });

    const goalies = data.goalies.map(mapPlayer).sort((a, b) => {
      // Sort by Save Percentage (SV%) descending
      return getStatValue(b, "SV%") - getStatValue(a, "SV%");
    });

    goalies.map((g) => {
      g.position = "G";
    });

    // Return skaters first, then goalies
    return [...skaters, ...goalies];
  },

  getPlayerGames: async (playerId: string): Promise<IGameLog[]> => {
    const response = await fetch(`${BASE_URL}/player/${playerId}/game-log/now`);
    if (!response.ok)
      throw new Error(
        `Failed to fetch player game log: ${response.statusText}`
      );
    const data = (await response.json()) as NHLGameLogResponse;

    return data.gameLog.map((game) => {
      const isHome = game.homeRoadFlag === "H";
      const opponent = `${isHome ? "vs" : "@"} ${game.opponentAbbrev}`;
      const stats: IStat[] = [];
      const isGoalie = game.savePctg !== undefined;

      if (isGoalie) {
        if (game.decision) stats.push({ label: "DEC", value: game.decision });
        if (game.goalsAgainst !== undefined)
          stats.push({ label: "GA", value: game.goalsAgainst });
        if (game.shotsAgainst !== undefined)
          stats.push({ label: "SA", value: game.shotsAgainst });
        if (game.savePctg !== undefined)
          stats.push({ label: "SV%", value: game.savePctg.toFixed(3) });
      } else {
        stats.push({ label: "G", value: game.goals ?? 0 });
        stats.push({ label: "A", value: game.assists ?? 0 });
        stats.push({ label: "P", value: game.points ?? 0 });
        stats.push({
          label: "+/-",
          value:
            (game.plusMinus ?? 0) > 0
              ? `+${game.plusMinus}`
              : game.plusMinus ?? 0,
        });
        stats.push({ label: "TOI", value: game.toi ?? "00:00" });
      }

      return {
        gameId: game.gameId.toString(),
        date: game.gameDate,
        opponent,
        stats,
      };
    });
  },
};

const nhlPositionAdapter: { [key: string]: HockeyPosition } = {
  C: "C",
  D: "D",
  G: "G",
  R: "R",
  L: "L",
};

export function getNHLPositionFullName(code: string): Position {
  console.log("Getting position for code:", code);
  return nhlPositionAdapter[code] || "N/A";
}
