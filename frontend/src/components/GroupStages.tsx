import { useState } from 'react';
import { Shield, CheckCircle } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  group_letter: string;
  fifa_ranking: number;
  elo_rating: number;
}

interface Match {
  id: number;
  team_a_id: string;
  team_b_id: string;
  stage: string;
  group_letter: string;
  team_a_score: number | null;
  team_b_score: number | null;
  status: string;
}

interface GroupStagesProps {
  teams: Team[];
  matches: Match[];
  onSelectMatch: (match: Match) => void;
}

interface StandingRow {
  team: Team;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

export default function GroupStages({ teams, matches, onSelectMatch }: GroupStagesProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('A');

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  // Calcular las tablas de posiciones dinámicamente a partir de los partidos y equipos
  const calculateGroupStandings = (groupLetter: string): StandingRow[] => {
    const groupTeams = teams.filter((t) => t.group_letter === groupLetter);
    const groupMatches = matches.filter(
      (m) => m.stage === 'group' && m.group_letter === groupLetter
    );

    const standingsMap: Record<string, StandingRow> = {};
    groupTeams.forEach((team) => {
      standingsMap[team.id] = {
        team,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
        dg: 0,
        pts: 0,
      };
    });

    groupMatches.forEach((m) => {
      if (m.status !== 'completed' || m.team_a_score === null || m.team_b_score === null) {
        return;
      }

      const teamA = standingsMap[m.team_a_id];
      const teamB = standingsMap[m.team_b_id];

      if (!teamA || !teamB) return;

      teamA.pj += 1;
      teamB.pj += 1;
      teamA.gf += m.team_a_score;
      teamA.gc += m.team_b_score;
      teamB.gf += m.team_b_score;
      teamB.gc += m.team_a_score;

      if (m.team_a_score > m.team_b_score) {
        teamA.pg += 1;
        teamA.pts += 3;
        teamB.pp += 1;
      } else if (m.team_a_score < m.team_b_score) {
        teamB.pg += 1;
        teamB.pts += 3;
        teamA.pp += 1;
      } else {
        teamA.pe += 1;
        teamA.pts += 1;
        teamB.pe += 1;
        teamB.pts += 1;
      }

      teamA.dg = teamA.gf - teamA.gc;
      teamB.dg = teamB.gf - teamB.gc;
    });

    // Ordenar standings
    return Object.values(standingsMap).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.fifa_ranking - b.team.fifa_ranking; // Menor ranking es mejor
    });
  };

  const currentStandings = calculateGroupStandings(selectedGroup);
  const groupMatches = matches.filter(
    (m) => m.stage === 'group' && m.group_letter === selectedGroup
  );

  const getTeamName = (id: string) => {
    return teams.find((t) => t.id === id)?.name || id;
  };

  return (
    <div className="space-y-6">
      {/* Selector de Grupos */}
      <div className="flex flex-wrap gap-2 justify-center py-2 bg-darkCard/40 rounded-xl border border-white/5 p-2 backdrop-blur-md">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGroup(g)}
            id={`btn-group-${g}`}
            className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all duration-200 ${
              selectedGroup === g
                ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/30 text-glow-blue'
                : 'bg-darkCard text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla de Standings */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Shield className="text-brandBlue w-5 h-5" />
              Tabla del Grupo {selectedGroup}
            </h2>
            <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">Fase de Grupos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                  <th className="py-3 px-2 text-center w-8">#</th>
                  <th className="py-3 px-4">Equipo</th>
                  <th className="py-3 px-3 text-center">PJ</th>
                  <th className="py-3 px-3 text-center">G</th>
                  <th className="py-3 px-3 text-center">E</th>
                  <th className="py-3 px-3 text-center">P</th>
                  <th className="py-3 px-3 text-center">GF</th>
                  <th className="py-3 px-3 text-center">GC</th>
                  <th className="py-3 px-3 text-center">DG</th>
                  <th className="py-3 px-4 text-center font-bold text-gray-200">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {currentStandings.map((row, idx) => {
                  const isQualifyingDirect = idx < 2;
                  return (
                    <tr
                      key={row.team.id}
                      className={`hover:bg-white/5 transition-colors ${
                        isQualifyingDirect ? 'bg-brandBlue/5' : ''
                      }`}
                    >
                      <td className="py-3.5 px-2 text-center font-bold font-mono">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            isQualifyingDirect
                              ? 'bg-brandBlue text-white font-bold'
                              : idx === 2
                              ? 'bg-brandNeon/30 text-brandNeon'
                              : 'text-gray-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-100 flex items-center gap-3">
                        <span className="text-2xl" role="img" aria-label="bandera">
                          ⚽
                        </span>
                        <div className="flex flex-col">
                          <span>{row.team.name}</span>
                          <span className="text-2xs text-gray-400 font-mono">
                            FIFA #{row.team.fifa_ranking} | Elo {row.team.elo_rating}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono">{row.pj}</td>
                      <td className="py-3.5 px-3 text-center font-mono text-green-400">{row.pg}</td>
                      <td className="py-3.5 px-3 text-center font-mono text-gray-400">{row.pe}</td>
                      <td className="py-3.5 px-3 text-center font-mono text-red-400">{row.pp}</td>
                      <td className="py-3.5 px-3 text-center font-mono">{row.gf}</td>
                      <td className="py-3.5 px-3 text-center font-mono">{row.gc}</td>
                      <td
                        className={`py-3.5 px-3 text-center font-mono font-bold ${
                          row.dg > 0 ? 'text-green-400' : row.dg < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}
                      >
                        {row.dg > 0 ? `+${row.dg}` : row.dg}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-extrabold text-white text-base">
                        {row.pts}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-4 text-xs text-gray-400 bg-black/20 p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-brandBlue inline-block"></span>
              <span>Clasifica directo (Top 2)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-brandNeon/30 border border-brandNeon inline-block"></span>
              <span>Candidato a mejor tercero</span>
            </div>
          </div>
        </div>

        {/* Fixture y Marcadores del Grupo */}
        <div className="glass-panel rounded-2xl p-5 shadow-2xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="text-brandNeon w-5 h-5" />
            Partidos del Grupo {selectedGroup}
          </h2>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {groupMatches.map((m) => {
              const completed = m.status === 'completed';
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(m)}
                  id={`match-card-${m.id}`}
                  className="bg-darkCard/60 border border-white/5 hover:border-brandNeon/30 hover:bg-darkCard/90 transition-all rounded-xl p-3 cursor-pointer flex flex-col gap-2.5 relative overflow-hidden"
                >
                  {/* Fila superior de metadatos (evita overlap) */}
                  <div className="flex justify-between items-center text-3xs font-mono">
                    <span className="text-gray-500">PARTIDO #{m.id}</span>
                    {completed ? (
                      <span className="bg-green-500/10 text-green-400 font-bold uppercase px-1.5 py-0.5 rounded border border-green-500/10">
                        Finalizado
                      </span>
                    ) : (
                      <span className="bg-white/5 text-gray-500 uppercase px-1.5 py-0.5 rounded border border-white/5">
                        Pendiente
                      </span>
                    )}
                  </div>

                  {/* Fila del enfrentamiento */}
                  <div className="flex justify-between items-center w-full gap-2">
                    {/* Team A */}
                    <div className="flex-1 text-center truncate">
                      <span className="font-bold text-xs uppercase tracking-wider text-gray-300 block truncate" title={getTeamName(m.team_a_id)}>
                        {getTeamName(m.team_a_id)}
                      </span>
                    </div>

                    {/* Marcador / VS */}
                    <div className="flex-shrink-0 px-2">
                      {completed ? (
                        <div className="flex items-center gap-1.5 font-bold font-mono text-xs bg-darkBg px-2.5 py-1 rounded-lg border border-white/10 text-white shadow-inner">
                          <span>{m.team_a_score}</span>
                          <span className="text-gray-600">-</span>
                          <span>{m.team_b_score}</span>
                        </div>
                      ) : (
                        <div className="text-3xs font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 text-gray-400 hover:text-white transition-colors">
                          VS
                        </div>
                      )}
                    </div>

                    {/* Team B */}
                    <div className="flex-1 text-center truncate">
                      <span className="font-bold text-xs uppercase tracking-wider text-gray-300 block truncate" title={getTeamName(m.team_b_id)}>
                        {getTeamName(m.team_b_id)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
