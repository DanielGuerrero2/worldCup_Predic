import { useState } from 'react';
import { Trophy, Award } from 'lucide-react';

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

interface BracketProps {
  teams: Team[];
  matches: Match[];
  onSelectMatch: (match: Match) => void;
}

interface BracketMatchInfo {
  id: number;
  label: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  completed: boolean;
  rawMatch?: Match;
}

export default function Bracket({ teams, matches, onSelectMatch }: BracketProps) {
  const [activeTab, setActiveTab] = useState<'R32' | 'R16' | 'QF' | 'FINAL'>('R16');

  const getTeamName = (id: string | null) => {
    if (!id) return 'Por definir';
    return teams.find((t) => t.id === id)?.name || id;
  };

  // Agrupar los partidos por etapa de eliminación
  const r32Matches = matches.filter((m) => m.stage === 'r32' || m.id >= 73 && m.id <= 88);
  const r16Matches = matches.filter((m) => m.stage === 'r16' || m.id >= 89 && m.id <= 96);
  const qfMatches = matches.filter((m) => m.stage === 'qf' || m.id >= 97 && m.id <= 100);
  const sfMatches = matches.filter((m) => m.stage === 'sf' || m.id === 101 || m.id === 102);
  const thirdPlaceMatch = matches.find((m) => m.stage === 'third_place' || m.id === 103);
  const finalMatch = matches.find((m) => m.stage === 'final' || m.id === 104);

  const formatMatch = (m: Match, label: string): BracketMatchInfo => {
    return {
      id: m.id,
      label,
      teamA: getTeamName(m.team_a_id),
      teamB: getTeamName(m.team_b_id),
      scoreA: m.team_a_score,
      scoreB: m.team_b_score,
      completed: m.status === 'completed',
      rawMatch: m
    };
  };

  const renderMatchCard = (m: Match, label: string) => {
    const info = formatMatch(m, label);
    return (
      <div
        key={m.id}
        onClick={() => onSelectMatch(m)}
        id={`bracket-match-${m.id}`}
        className="glass-panel hover:border-brandBlue/40 hover:bg-darkCard/80 transition-all p-3 rounded-xl cursor-pointer select-none space-y-2 relative overflow-hidden"
      >
        <div className="flex justify-between items-center text-3xs font-mono text-gray-500 border-b border-white/5 pb-1">
          <span>PARTIDO #{m.id}</span>
          <span className="text-brandNeon font-semibold uppercase">{label}</span>
        </div>
        
        <div className="space-y-1.5">
          {/* Team A */}
          <div className="flex justify-between items-center">
            <span className={`text-xs font-semibold truncate max-w-[120px] ${info.completed && info.scoreA! > info.scoreB! ? 'text-brandGold font-bold text-glow-gold' : 'text-gray-300'}`}>
              {info.teamA}
            </span>
            {info.completed && (
              <span className="font-mono font-bold text-xs bg-darkBg px-2 py-0.5 rounded text-white border border-white/5">
                {info.scoreA}
              </span>
            )}
          </div>
          
          {/* Team B */}
          <div className="flex justify-between items-center">
            <span className={`text-xs font-semibold truncate max-w-[120px] ${info.completed && info.scoreB! > info.scoreA! ? 'text-brandGold font-bold text-glow-gold' : 'text-gray-300'}`}>
              {info.teamB}
            </span>
            {info.completed && (
              <span className="font-mono font-bold text-xs bg-darkBg px-2 py-0.5 rounded text-white border border-white/5">
                {info.scoreB}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Pestañas del Bracket */}
      <div className="flex gap-2 justify-center py-2 bg-darkCard/40 rounded-xl border border-white/5 p-1 max-w-md mx-auto backdrop-blur-md">
        <button
          onClick={() => setActiveTab('R32')}
          id="tab-bracket-r32"
          className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${
            activeTab === 'R32'
              ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/30 text-glow-blue'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          16avos (R32)
        </button>
        <button
          onClick={() => setActiveTab('R16')}
          id="tab-bracket-r16"
          className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${
            activeTab === 'R16'
              ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/30 text-glow-blue'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Octavos (R16)
        </button>
        <button
          onClick={() => setActiveTab('QF')}
          id="tab-bracket-qf"
          className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${
            activeTab === 'QF'
              ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/30 text-glow-blue'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Cuartos (QF)
        </button>
        <button
          onClick={() => setActiveTab('FINAL')}
          id="tab-bracket-final"
          className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${
            activeTab === 'FINAL'
              ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/30 text-glow-blue'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Fase Final
        </button>
      </div>

      {/* Renderizado de Llaves */}
      <div className="glass-panel rounded-2xl p-6 shadow-2xl relative min-h-[400px]">
        {activeTab === 'R32' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            {r32Matches.length > 0 ? (
              r32Matches.map((m, idx) => renderMatchCard(m, `1/16 - ${idx + 1}`))
            ) : (
              <div className="col-span-full text-center py-10 text-gray-500 font-mono text-sm">
                No hay partidos de 16avos cargados en la base de datos.
              </div>
            )}
          </div>
        )}

        {activeTab === 'R16' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            {r16Matches.length > 0 ? (
              r16Matches.map((m, idx) => renderMatchCard(m, `Octavos - ${idx + 1}`))
            ) : (
              <div className="col-span-full text-center py-10 text-gray-500 font-mono text-sm">
                Los octavos de final se definirán al finalizar la fase de grupos.
              </div>
            )}
          </div>
        )}

        {activeTab === 'QF' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto animate-fadeIn">
            {qfMatches.length > 0 ? (
              qfMatches.map((m, idx) => renderMatchCard(m, `Cuartos - ${idx + 1}`))
            ) : (
              <div className="col-span-full text-center py-10 text-gray-500 font-mono text-sm">
                Los cuartos de final se definirán al finalizar los octavos.
              </div>
            )}
          </div>
        )}

        {activeTab === 'FINAL' && (
          <div className="space-y-8 max-w-2xl mx-auto animate-fadeIn">
            {/* Semifinales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sfMatches.map((m, idx) => (
                <div key={m.id} className="relative">
                  <div className="absolute -top-3 left-4 bg-brandBlue px-2 py-0.5 rounded text-4xs font-mono font-bold text-white uppercase">
                    Semifinal {idx + 1}
                  </div>
                  {renderMatchCard(m, `Semifinal`)}
                </div>
              ))}
            </div>

            {/* Gran Final & Tercer Lugar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-white/5 pt-6">
              {/* Tercer Lugar */}
              {thirdPlaceMatch && (
                <div className="relative">
                  <div className="absolute -top-3 left-4 bg-brandNeon/80 px-2 py-0.5 rounded text-4xs font-mono font-bold text-white uppercase flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    3er Lugar
                  </div>
                  {renderMatchCard(thirdPlaceMatch, '3er Puesto')}
                </div>
              )}

              {/* Gran Final */}
              {finalMatch && (
                <div className="relative border border-brandGold/30 bg-brandGold/5 rounded-2xl p-1 pulse-glow">
                  <div className="absolute -top-3 left-4 bg-brandGold px-2.5 py-0.5 rounded text-4xs font-mono font-bold text-darkBg uppercase flex items-center gap-1 font-extrabold text-glow-gold">
                    <Trophy className="w-3 h-3" />
                    Gran Final
                  </div>
                  {renderMatchCard(finalMatch, 'Campeonato')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
