import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { ISportAdapter, ITeam, IPlayer, IGameLog, IStat } from '../sports/types';

interface Props {
  adapter: ISportAdapter;
}

export const TeamDashboard: React.FC<Props> = ({ adapter }) => {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<ITeam | null>(null);
  const [players, setPlayers] = useState<IPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<IPlayer | null>(null);
  const [gameLog, setGameLog] = useState<IGameLog[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [activeTab, setActiveTab] = useState<'season' | 'recent'>('recent');
  const [gameLogPage, setGameLogPage] = useState(1);

  useEffect(() => {
    if (!teamId) return;

    const fetchData = async () => {
      try {
        const teamData = await adapter.getTeamDetails(teamId);
        const playerData = await adapter.getPlayers(teamId);
        setTeam(teamData);
        setPlayers(playerData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [adapter, teamId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!team) return <div className="p-6">Team not found</div>;

  const handlePlayerClick = (player: IPlayer) => {
    setSelectedPlayer(player);
    setGameLog([]);
    setLoadingGames(true);
    setActiveTab('recent');
    setGameLogPage(1);
    adapter.getPlayerGames(player.id)
      .then(setGameLog)
      .catch(console.error)
      .finally(() => setLoadingGames(false));
  };

  const renderGameLogTable = (games: IGameLog[]) => {
    if (!games || games.length === 0) {
      return <div className="text-center py-4 text-gray-500">No game log data available.</div>;
    }

    // Use the full gameLog to determine headers so columns don't jump around between tabs/pages
    const headers = Array.from(new Set(gameLog.flatMap(g => g.stats.map(s => s.label))));

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
          <thead className="bg-gray-50 text-gray-500 border-b">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Opponent</th>
              {headers.map(label => <th key={label} className="px-4 py-2 font-medium text-center">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {games.map(game => (
              <tr key={game.gameId} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2">{game.date}</td>
                <td className="px-4 py-2">{game.opponent}</td>
                {headers.map(label => {
                  const stat = game.stats.find(s => s.label === label);
                  return <td key={label} className="px-4 py-2 font-mono text-center">{stat?.value ?? '-'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderStatsSummary = (games: IGameLog[], title: string) => {
    if (!selectedPlayer || games.length === 0) return null;

    const isGoalie = selectedPlayer.position === "G";
    let summaryStats: IStat[] = [];

    if (isGoalie) {
      const wins = games.filter(g => g.stats.some(s => s.label === 'DEC' && s.value === 'W')).length;
      const losses = games.filter(g => g.stats.some(s => s.label === 'DEC' && s.value === 'L')).length;
      const goalsAgainst = games.reduce((sum, game) => sum + (Number(game.stats.find(s => s.label === 'GA')?.value) || 0), 0);
      const shotsAgainst = games.reduce((sum, game) => sum + (Number(game.stats.find(s => s.label === 'SA')?.value) || 0), 0);
      
      const savePercentage = shotsAgainst > 0 ? ((shotsAgainst - goalsAgainst) / shotsAgainst).toFixed(3) : '0.000';

      summaryStats = [
        { label: 'GP', value: games.length },
        { label: 'W', value: wins },
        { label: 'L', value: losses },
        { label: 'GA', value: goalsAgainst },
        { label: 'SA', value: shotsAgainst },
        { label: 'SV%', value: savePercentage },
      ];
      
      // For season totals, we can pull the GAA from the main player stats, as it's hard to calculate from game logs without TOI.
      if (title === 'Season Totals') {
        const gaaStat = selectedPlayer.stats.find(s => s.label === 'GAA');
        if (gaaStat) {
          summaryStats.push(gaaStat);
        }
      }
    } else { // Skater
      const goals = games.reduce((sum, game) => sum + (Number(game.stats.find(s => s.label === 'G')?.value) || 0), 0);
      const assists = games.reduce((sum, game) => sum + (Number(game.stats.find(s => s.label === 'A')?.value) || 0), 0);
      const points = goals + assists;
      const plusMinus = games.reduce((sum, game) => sum + (Number(game.stats.find(s => s.label === '+/-')?.value) || 0), 0);
      const timeOnIce = games.reduce((sum, game) => {
        const toiStat = game.stats.find(s => s.label === 'TOI');
        if (toiStat) {
          const mins = toiStat.value.toString().split(':').map(Number)[0] || 0;
          return sum + mins ;
        }
        return sum;
      }, 0);

      summaryStats = [
        { label: 'GP', value: games.length },
        { label: 'G', value: goals },
        { label: 'A', value: assists },
        { label: 'P', value: points },
        { label: '+/-', value: plusMinus },
        { label: 'TOI', value: timeOnIce }
      ];
    }

    return (
      <div className="mb-8">
        <h4 className="text-md font-semibold mb-3">{title}</h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
          {summaryStats.map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-xs text-blue-600 font-bold uppercase">{stat.label}</div>
              <div className="text-xl font-bold text-blue-900">{stat.label === '+/-' && typeof stat.value === 'number' && stat.value > 0 ? `+${stat.value}` : stat.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const gamesPerPage = 8;
  const paginatedGameLog = gameLog.slice(
    (gameLogPage - 1) * gamesPerPage,
    gameLogPage * gamesPerPage
  );
  const totalGameLogPages = Math.ceil(gameLog.length / gamesPerPage);

  return (
    <div className="p-6">
      <div className="mb-8">
        <Link to={`/${adapter.leagueName.toLowerCase()}`} className="text-blue-500 hover:underline mb-4 inline-block">&larr; Back to League</Link>
        <div className="flex items-center gap-6">
           <img src={team.logoUrl} alt={team.name} className="w-24 h-24" />
           <div>
             <h1 className="text-4xl font-bold">{team.name}</h1>
             <p className="text-xl text-gray-600">{team.wins}W - {team.losses}L</p>
           </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Roster</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map(player => (
          <div 
            key={player.id} 
            className="border p-4 rounded-lg shadow bg-white hover:shadow-lg transition cursor-pointer"
            onClick={() => handlePlayerClick(player)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-4">
                {player.headshotUrl && <img src={player.headshotUrl} alt={player.name} className="w-12 h-12 rounded-full bg-gray-100 object-cover" />}
                <div>
                  <div className="font-bold text-lg">{player.name}</div>
                  <div className="text-gray-500 text-sm">{player.position} {player.number && <>&bull; #{player.number}</>}</div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
              {/* Show only first 4 stats on the card */}
              {player.stats.slice(0, 4).map(stat => (
                <div key={stat.label} className="flex flex-col">
                  <span className="text-xs text-gray-500 uppercase">{stat.label}</span>
                  <span className="font-mono font-bold">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={() => setSelectedPlayer(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 text-white p-6 flex items-center gap-6 relative">
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                ✕
              </button>
              {selectedPlayer.headshotUrl && (
                <img src={selectedPlayer.headshotUrl} alt={selectedPlayer.name} className="w-24 h-24 rounded-full border-4 border-white/20 bg-white/10" />
              )}
              <div>
                <h2 className="text-2xl font-bold">{selectedPlayer.name}</h2>
                <p className="text-gray-300 text-lg">{selectedPlayer.number && <>#{selectedPlayer.number} &bull; </>}{selectedPlayer.position}</p>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b bg-gray-50">
              <button
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'recent' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('recent')}
              >
                Last 5 Games
              </button>
              <button
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'season' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('season')}
              >
                Season Stats
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'season' && (
                <>
                  {renderStatsSummary(gameLog, "Season Totals")}
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4">Season Game Log</h3>
                      {loadingGames ? (
                        <div className="text-center py-8 text-gray-500">Loading game log...</div>
                      ) : gameLog.length > 0 ? (
                        <>
                          {renderGameLogTable(paginatedGameLog)}
                          {totalGameLogPages > 1 && (
                            <div className="flex justify-between items-center mt-4">
                              <button
                                onClick={() => setGameLogPage((p) => Math.max(1, p - 1))}
                                disabled={gameLogPage === 1}
                                className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <span className="text-sm text-gray-700">
                                Page {gameLogPage} of {totalGameLogPages}
                              </span>
                              <button
                                onClick={() => setGameLogPage((p) => Math.min(totalGameLogPages, p + 1))}
                                disabled={gameLogPage === totalGameLogPages}
                                className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </>
                      ) : (<div className="text-center py-4 text-gray-500">No game log data available.</div>)}
                  </div>
                </>
              )}

              {activeTab === 'recent' && (
                loadingGames ? (
                  <div className="text-gray-500 text-center py-8">Loading game logs...</div>
                ) : (
                  <>
                    {renderStatsSummary(gameLog.slice(0, 5), "Last 5 Games Totals")}
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-lg font-semibold mb-4">Game Log</h3>
                      {renderGameLogTable(gameLog.slice(0, 5))}
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};