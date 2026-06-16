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

  const renderMatchCard = (
    m: Match,
    label: string,
    variant: 'default' | 'semifinal' | 'final' | 'third_place' = 'default'
  ) => {
    const info = formatMatch(m, label);
    
    // Configuración de estilos según variante
    let cardClasses = "glass-panel hover:bg-darkCard/80 transition-all cursor-pointer select-none relative overflow-hidden";
    let teamNameClasses = "text-xs font-semibold truncate max-w-[140px]";
    let scoreClasses = "font-mono font-bold text-xs bg-darkBg px-2 py-0.5 rounded text-white border border-white/5";
    
    if (variant === 'default') {
      cardClasses += " hover:border-brandBlue/40 p-3 rounded-xl space-y-2";
      teamNameClasses += " text-gray-300";
    } else if (variant === 'semifinal') {
      cardClasses += " border-brandBlue/20 hover:border-brandBlue/50 hover:bg-darkCard/95 p-4 rounded-xl space-y-2.5 shadow-lg shadow-brandBlue/5";
      teamNameClasses += " text-gray-200";
      scoreClasses = "font-mono font-bold text-xs bg-brandBlue/10 text-brandBlue px-2.5 py-0.5 rounded border border-brandBlue/20";
    } else if (variant === 'third_place') {
      cardClasses += " border-brandNeon/20 hover:border-brandNeon/50 hover:bg-darkCard/95 p-4 rounded-xl space-y-2.5 shadow-lg shadow-brandNeon/5";
      teamNameClasses += " text-gray-200";
      scoreClasses = "font-mono font-bold text-xs bg-brandNeon/10 text-brandNeon px-2.5 py-0.5 rounded border border-brandNeon/20";
    } else if (variant === 'final') {
      cardClasses += " border-brandGold/30 bg-gradient-to-br from-darkCard via-darkCard to-brandGold/5 hover:border-brandGold/65 hover:bg-darkCard/95 p-5 rounded-2xl space-y-3.5 shadow-xl shadow-brandGold/5 pulse-glow";
      teamNameClasses = "text-sm font-bold truncate max-w-[160px] text-gray-100";
      scoreClasses = "font-mono font-bold text-sm bg-black/40 px-3.5 py-1 rounded text-white border border-white/10";
    }

    const isWinnerA = info.completed && info.scoreA! > info.scoreB!;
    const isWinnerB = info.completed && info.scoreB! > info.scoreA!;

    const placeholderScore = (
      <span className="font-mono text-3xs text-gray-600 bg-white/5 px-2 py-0.5 rounded border border-white/5 min-w-[20px] text-center">
        -
      </span>
    );

    return (
      <div
        key={m.id}
        onClick={() => onSelectMatch(m)}
        id={`bracket-match-${m.id}`}
        className={cardClasses}
      >
        <div className="flex justify-between items-center text-3xs font-mono text-gray-500 border-b border-white/5 pb-1.5">
          <span>PARTIDO #{m.id}</span>
          <span className={`${variant === 'final' ? 'text-brandGold font-extrabold text-glow-gold' : variant === 'third_place' ? 'text-brandNeon font-extrabold text-glow-neon' : 'text-brandNeon font-semibold'} uppercase`}>{label}</span>
        </div>
        
        <div className="space-y-2">
          {/* Team A */}
          <div className="flex justify-between items-center">
            <span className={`${teamNameClasses} ${isWinnerA ? 'text-brandGold font-bold text-glow-gold' : ''} flex items-center gap-1.5`}>
              {variant === 'final' && isWinnerA && <Trophy className="w-3.5 h-3.5 text-brandGold fill-brandGold/20 flex-shrink-0 animate-pulse" />}
              {variant === 'third_place' && isWinnerA && <Award className="w-3.5 h-3.5 text-brandNeon fill-brandNeon/20 flex-shrink-0" />}
              <span className="truncate">{info.teamA}</span>
            </span>
            {info.completed ? (
              <span className={scoreClasses}>
                {info.scoreA}
              </span>
            ) : placeholderScore}
          </div>
          
          {/* Team B */}
          <div className="flex justify-between items-center">
            <span className={`${teamNameClasses} ${isWinnerB ? 'text-brandGold font-bold text-glow-gold' : ''} flex items-center gap-1.5`}>
              {variant === 'final' && isWinnerB && <Trophy className="w-3.5 h-3.5 text-brandGold fill-brandGold/20 flex-shrink-0 animate-pulse" />}
              {variant === 'third_place' && isWinnerB && <Award className="w-3.5 h-3.5 text-brandNeon fill-brandNeon/20 flex-shrink-0" />}
              <span className="truncate">{info.teamB}</span>
            </span>
            {info.completed ? (
              <span className={scoreClasses}>
                {info.scoreB}
              </span>
            ) : placeholderScore}
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
          className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${activeTab === 'R32'
            ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/30 text-glow-blue'
            : 'text-gray-400 hover:text-white'
            }`}
        >
          16avos (R32)
        </button>
        <button
          onClick={() => setActiveTab('R16')}
          id="tab-bracket-r16"
          className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${activeTab === 'R16'
            ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/30 text-glow-blue'
            : 'text-gray-400 hover:text-white'
            }`}
        >
          Octavos (R16)
        </button>
        <button
          onClick={() => setActiveTab('QF')}
          id="tab-bracket-qf"
          className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${activeTab === 'QF'
            ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/30 text-glow-blue'
            : 'text-gray-400 hover:text-white'
            }`}
        >
          Cuartos (QF)
        </button>
        <button
          onClick={() => setActiveTab('FINAL')}
          id="tab-bracket-final"
          className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${activeTab === 'FINAL'
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
          <div className="space-y-6 max-w-3xl mx-auto animate-fadeIn py-2">
            {/* Sección: Semifinales */}
            <div className="space-y-3">
              <h3 className="text-3xs font-mono font-bold text-gray-400 uppercase tracking-widest text-left border-l-2 border-brandBlue pl-2.5 ml-1 select-none">
                Semifinales
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {sfMatches.map((m, idx) => (
                  <div key={m.id} className="relative group">
                    {/* Badge flotante */}
                    <div className="absolute -top-4 left-4 z-10 bg-brandBlue text-white font-mono font-extrabold text-[11px] uppercase px-3 py-1 rounded-full shadow-md shadow-brandBlue/35 border border-white/10 tracking-wider">
                      Semifinal {idx + 1}
                    </div>
                    {renderMatchCard(m, `Semifinal`, 'semifinal')}
                  </div>
                ))}
              </div>
            </div>

            {/* Conectores visuales */}
            <div className="hidden sm:flex justify-around items-center h-4 relative">
              <div className="w-1/2 border-r border-dashed border-white/10 h-full"></div>
              <div className="w-1/2 border-l border-dashed border-white/10 h-full"></div>
            </div>

            {/* Sección: Finales (Gran Final y 3er Puesto) */}
            <div className="space-y-3">
              <h3 className="text-3xs font-mono font-bold text-gray-400 uppercase tracking-widest text-left border-l-2 border-brandNeon pl-2.5 ml-1 select-none">
                Finales
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {thirdPlaceMatch && (
                  <div className="relative">
                    <div className="absolute -top-4 left-4 z-10 bg-brandNeon/90 text-white font-mono font-extrabold text-[11px] uppercase px-3 py-1 rounded-full shadow-md shadow-brandNeon/35 border border-white/10 tracking-wider flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      Tercer Lugar
                    </div>
                    {renderMatchCard(thirdPlaceMatch, '3er Puesto', 'third_place')}
                  </div>
                )}

                {/* Gran Final */}
                {finalMatch && (
                  <div className="relative">
                    <div className="absolute -top-4 left-4 z-10 bg-brandGold text-darkBg font-mono font-extrabold text-xs uppercase px-3.5 py-1 rounded-full shadow-lg shadow-brandGold/35 border border-brandGold/40 tracking-widest flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 fill-darkBg" />
                      Gran Final
                    </div>
                    {renderMatchCard(finalMatch, 'Campeonato', 'final')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
