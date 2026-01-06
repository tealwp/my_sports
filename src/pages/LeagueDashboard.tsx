import React, { useEffect, useState } from "react";
import type { ISportAdapter, ITeam } from "../sports/types";
import { Link } from "react-router-dom";

interface Props {
  adapter: ISportAdapter;
}

export const LeagueDashboard: React.FC<Props> = ({ adapter }) => {
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adapter
      .getTeams()
      .then((data) => {
        setTeams(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load league data:", err);
        setError("Failed to load data. Check console for details.");
        setLoading(false);
      });
  }, [adapter]);

  if (loading)
    return <div className="p-6">Loading {adapter.leagueName} data...</div>;
  if (error)
    return <div className="p-6 text-red-600 font-bold">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        {adapter.leagueName} Standings
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <div
            key={team.id}
            className="border rounded-lg p-4 shadow hover:shadow-lg transition"
          >
            <div className="flex items-center gap-4">
              <img src={team.logoUrl} alt={team.name} className="w-12 h-12" />
              <div>
                <h2 className="text-xl font-semibold">{team.name}</h2>
                <p className="text-gray-600">
                  {team.wins}W - {team.losses}L
                </p>
                <Link
                  to={`/nhl/team/${team.id}`}
                  className="text-blue-500 hover:underline text-sm"
                >
                  View Roster
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
