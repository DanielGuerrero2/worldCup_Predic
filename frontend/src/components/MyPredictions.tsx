import { useState, useEffect } from 'react';
import { Calendar, Trash2, Edit3, RotateCcw, Trophy, Sparkles, Check, Play, History } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  group_letter: string;
  fifa_ranking: number;
  elo_rating: number;
  attack_strength: number;
  defense_strength: number;
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

interface MyPredictionsProps {
  teams: Team[];
  matches: Match[];
  onResetMatch: (matchId: number) => void;
  onResetAllUserPredictions: () => void;
  onSelectMatch: (match: Match) => void;
  onApplyPrediction: (matchId: number, scoreA: number, scoreB: number) => void;
  onLoadH2H: (teamA: string, teamB: string, model: string) => void;
}

export default function MyPredictions({
  teams,
  matches,
  onResetMatch,
  onResetAllUserPredictions,
  onSelectMatch,
  onApplyPrediction,
  onLoadH2H
}: MyPredictionsProps) {
  const [subTab, setSubTab] = useState<'USER' | 'MODEL' | 'H2H_HISTORY'>('USER');
  const [modelType, setModelType] = useState<string>('dixon_coles');

  const [savedPredictions, setSavedPredictions] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('wc2026_h2h_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (subTab === 'H2H_HISTORY') {
      try {
        const saved = localStorage.getItem('wc2026_h2h_history');
        setSavedPredictions(saved ? JSON.parse(saved) : []);
      } catch (e) {
        console.error(e);
      }
    }
  }, [subTab]);

  const handleDeleteSaved = (id: string) => {
    const updated = savedPredictions.filter((p) => p.id !== id);
    setSavedPredictions(updated);
    localStorage.setItem('wc2026_h2h_history', JSON.stringify(updated));
  };

  // Las 4 IDs de los primeros partidos reales
  const officialMatchIds = [1, 2, 7, 19];

  // Filtrar partidos completados
  const completedMatches = matches.filter(
    (m) => m.status === 'completed' && m.team_a_score !== null && m.team_b_score !== null
  );

  // Clasificar en oficiales y de usuario
  const officialMatches = completedMatches.filter((m) => officialMatchIds.includes(m.id));
  const userPredictions = completedMatches.filter((m) => !officialMatchIds.includes(m.id));

  // Filtrar partidos de grupos
  const groupMatches = matches.filter((m) => m.stage === 'group');

  const getTeamName = (id: string | null) => {
    if (!id) return 'Por definir';
    return teams.find((t) => t.id === id)?.name || id;
  };

  const getStageName = (stage: string, groupLetter?: string) => {
    switch (stage) {
      case 'group':
        return `Grupo ${groupLetter || ''}`;
      case 'r32':
        return 'Dieciseisavos (R32)';
      case 'r16':
        return 'Octavos de Final';
      case 'qf':
        return 'Cuartos de Final';
      case 'sf':
        return 'Semifinales';
      case 'third_place':
        return 'Tercer Lugar';
      case 'final':
        return 'Gran Final';
      default:
        return stage;
    }
  };

  // Calcular predicciones matemáticas del modelo Poisson/Dixon-Coles en el cliente
  const getMatchPrediction = (m: Match, model: string) => {
    const teamA = teams.find((t) => t.id === m.team_a_id);
    const teamB = teams.find((t) => t.id === m.team_b_id);
    if (!teamA || !teamB) return null;

    const isHomeA = ['USA', 'MEX', 'CAN'].includes(teamA.id);
    const isHomeB = ['USA', 'MEX', 'CAN'].includes(teamB.id);

    const homeMultA = isHomeA ? 1.12 : 1.0;
    const homeMultB = isHomeB ? 1.12 : 1.0;

    const avgHome = 1.35;
    const avgAway = 1.15;

    const lambdaA = Math.max(0.1, teamA.attack_strength * teamB.defense_strength * avgHome * homeMultA);
    const lambdaB = Math.max(0.1, teamB.attack_strength * teamA.defense_strength * avgAway * homeMultB);

    // Grilla Poisson 6x6
    const maxGoals = 6;
    const grid = Array.from({ length: maxGoals + 1 }, () => new Float64Array(maxGoals + 1));

    const poisson = (k: number, lam: number) => {
      let fact = 1;
      for (let i = 2; i <= k; i++) fact *= i;
      return (Math.pow(lam, k) * Math.exp(-lam)) / fact;
    };

    let total = 0;
    for (let x = 0; x <= maxGoals; x++) {
      for (let y = 0; y <= maxGoals; y++) {
        const p = poisson(x, lambdaA) * poisson(y, lambdaB);
        grid[x][y] = p;
        total += p;
      }
    }

    for (let x = 0; x <= maxGoals; x++) {
      for (let y = 0; y <= maxGoals; y++) {
        grid[x][y] /= total;
      }
    }

    if (model === 'dixon_coles') {
      const rho = -0.08;
      grid[0][0] *= Math.max(0, 1 - rho * lambdaA * lambdaB);
      grid[1][0] *= Math.max(0, 1 + rho * lambdaB);
      grid[0][1] *= Math.max(0, 1 + rho * lambdaA);
      grid[1][1] *= Math.max(0, 1 - rho);

      let newTotal = 0;
      for (let x = 0; x <= maxGoals; x++) {
        for (let y = 0; y <= maxGoals; y++) newTotal += grid[x][y];
      }
      for (let x = 0; x <= maxGoals; x++) {
        for (let y = 0; y <= maxGoals; y++) {
          grid[x][y] /= newTotal;
        }
      }
    }

    let winA = 0;
    let draw = 0;
    let winB = 0;
    for (let x = 0; x <= maxGoals; x++) {
      for (let y = 0; y <= maxGoals; y++) {
        if (x > y) winA += grid[x][y];
        else if (x === y) draw += grid[x][y];
        else winB += grid[x][y];
      }
    }

    return {
      scoreA: Math.round(lambdaA),
      scoreB: Math.round(lambdaB),
      probWinA: winA,
      probDraw: draw,
      probWinB: winB
    };
  };

  return (
    <div className="space-y-6 animate-scaleUp">
      {/* Selector de sub-pestaña */}
      <div className="flex gap-2 border-b border-white/5 pb-4">
        <button
          onClick={() => setSubTab('USER')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ${
            subTab === 'USER'
              ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/35 text-glow-blue'
              : 'text-gray-400 hover:text-white bg-darkCard/50 border border-white/5'
          }`}
        >
          Mis Marcadores Proyectados
        </button>
        <button
          onClick={() => setSubTab('MODEL')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ${
            subTab === 'MODEL'
              ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/35 text-glow-blue'
              : 'text-gray-400 hover:text-white bg-darkCard/50 border border-white/5'
          }`}
        >
          Predicciones del Modelo (Poisson)
        </button>
        <button
          onClick={() => setSubTab('H2H_HISTORY')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ${
            subTab === 'H2H_HISTORY'
              ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/35 text-glow-blue'
              : 'text-gray-400 hover:text-white bg-darkCard/50 border border-white/5'
          }`}
        >
          Historial H2H del Modelo
        </button>
      </div>

      {subTab === 'USER' && (
        <>
          {/* Encabezado e Info */}
          <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2 text-brandGold">
                <Trophy className="w-5 h-5 text-brandGold" />
                Mis Predicciones y Resultados
              </h2>
              <p className="text-xs text-gray-400 max-w-2xl">
                Aquí puedes ver los partidos cuyos marcadores has fijado. El motor de simulación de Monte Carlo respeta estos marcadores (los trata como fijos al 100%) y simula dinámicamente el resto de la copa a partir de estos resultados.
              </p>
            </div>

            {userPredictions.length > 0 && (
              <button
                onClick={onResetAllUserPredictions}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4" />
                Resetear Mis Predicciones
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sección de Predicciones del Usuario */}
            <div className="glass-panel rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-brandBlue flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Tus Marcadores Proyectados ({userPredictions.length})
                </h3>
                <span className="text-3xs font-mono text-gray-500">Editado por el usuario</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {userPredictions.length > 0 ? (
                  userPredictions.map((m) => (
                    <div
                      key={m.id}
                      className="bg-darkCard/50 border border-white/5 hover:border-brandBlue/30 rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all duration-200 relative group"
                    >
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex-1 text-right pr-2">
                          <span className="font-bold text-xs block text-gray-200 truncate">
                            {getTeamName(m.team_a_id)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono font-bold text-sm bg-darkBg px-3 py-1.5 rounded-lg border border-white/10 text-white min-w-[70px] justify-center">
                          <span>{m.team_a_score}</span>
                          <span className="text-gray-600 text-xs">-</span>
                          <span>{m.team_b_score}</span>
                        </div>

                        <div className="flex-1 text-left pl-2">
                          <span className="font-bold text-xs block text-gray-200 truncate">
                            {getTeamName(m.team_b_id)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 border-l border-white/5 pl-3">
                        <span className="text-3xs font-mono text-gray-500 uppercase mr-1.5 hidden sm:inline">
                          {getStageName(m.stage, m.group_letter)}
                        </span>
                        <button
                          onClick={() => onSelectMatch(m)}
                          title="Editar marcador"
                          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onResetMatch(m.id)}
                          title="Resetear partido"
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 text-gray-500 font-mono text-xs space-y-2">
                    <div>No has hecho ninguna predicción aún.</div>
                    <div className="text-3xs text-gray-600 max-w-xs mx-auto">
                      Haz clic en cualquier partido en las pestañas de "Grupos" o "Bracket" para ingresar tu marcador personalizado.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resultados Reales / Oficiales */}
            <div className="glass-panel rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-brandGold flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Resultados Oficiales de Jornada 1 ({officialMatches.length})
                </h3>
                <span className="text-3xs font-mono text-brandGold/75">Datos reales de la FIFA</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {officialMatches.map((m) => (
                  <div
                    key={m.id}
                    className="bg-darkCard/30 border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-4 relative"
                  >
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex-1 text-right pr-2">
                        <span className="font-bold text-xs block text-gray-300 truncate">
                          {getTeamName(m.team_a_id)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono font-bold text-sm bg-brandGold/5 px-3 py-1.5 rounded-lg border border-brandGold/20 text-brandGold min-w-[70px] justify-center text-glow-gold">
                        <span>{m.team_a_score}</span>
                        <span className="text-gray-600 text-xs">-</span>
                        <span>{m.team_b_score}</span>
                      </div>

                      <div className="flex-1 text-left pl-2">
                        <span className="font-bold text-xs block text-gray-300 truncate">
                          {getTeamName(m.team_b_id)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 border-l border-white/5 pl-3 font-mono text-3xs text-gray-500 uppercase">
                      {getStageName(m.stage, m.group_letter)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {subTab === 'MODEL' && (
        <>
          {/* Encabezado e Info del Modelo */}
          <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2 text-brandGold">
                <Sparkles className="w-5 h-5 text-brandGold" />
                Predicciones del Modelo (Poisson/Dixon-Coles)
              </h2>
              <p className="text-xs text-gray-400 max-w-2xl">
                Estas son las predicciones calculadas por el modelo matemático para todos los partidos de la Fase de Grupos. Puedes aplicar el marcador sugerido por el modelo a tu fixture con un solo clic.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-darkCard border border-white/10 px-3 py-1.5 rounded-xl">
              <span className="text-3xs font-mono text-gray-400 uppercase">Modelo:</span>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="bg-transparent text-xs font-bold text-brandGold focus:outline-none cursor-pointer"
              >
                <option value="dixon_coles">Poisson + Dixon-Coles</option>
                <option value="poisson">Poisson Puro</option>
              </select>
            </div>
          </div>

          {/* Tabla de Predicciones del Modelo */}
          <div className="glass-panel rounded-2xl p-5 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-3xs uppercase font-semibold">
                    <th className="py-3 px-3">Partido</th>
                    <th className="py-3 px-3 text-right">Selección A</th>
                    <th className="py-3 px-4 text-center font-bold text-brandGold">Proy.</th>
                    <th className="py-3 px-3 text-left">Selección B</th>
                    <th className="py-3 px-3 text-center">Prob. Victoria A</th>
                    <th className="py-3 px-3 text-center">Prob. Empate</th>
                    <th className="py-3 px-3 text-center">Prob. Victoria B</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {groupMatches.map((m) => {
                    const pred = getMatchPrediction(m, modelType);
                    const completed = m.status === 'completed';
                    if (!pred) return null;

                    return (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-mono text-gray-500 text-3xs">
                          #{m.id} ({getStageName(m.stage, m.group_letter)})
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-gray-200">
                          {getTeamName(m.team_a_id)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-extrabold text-brandGold bg-brandGold/5 border border-brandGold/15 px-2.5 py-1 rounded-lg text-glow-gold">
                            {pred.scoreA} - {pred.scoreB}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-left font-semibold text-gray-200">
                          {getTeamName(m.team_b_id)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span className="text-brandBlue font-bold">{(pred.probWinA * 100).toFixed(1)}%</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-gray-400">
                          {(pred.probDraw * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span className="text-brandNeon font-bold">{(pred.probWinB * 100).toFixed(1)}%</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {completed ? (
                            <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 text-3xs font-mono font-semibold px-2 py-0.5 rounded border border-green-500/10">
                              <Check className="w-3 h-3" /> Fijo
                            </span>
                          ) : (
                            <button
                              onClick={() => onApplyPrediction(m.id, pred.scoreA, pred.scoreB)}
                              className="bg-brandBlue/10 hover:bg-brandBlue text-brandBlue hover:text-white border border-brandBlue/20 hover:border-transparent transition-all px-2.5 py-1 rounded-lg text-3xs font-bold"
                            >
                              Aplicar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {subTab === 'H2H_HISTORY' && (
        <>
          {/* Encabezado e Info de H2H */}
          <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2 text-brandGold">
                <History className="w-5 h-5 text-brandGold" />
                Historial de Predicciones Guardadas (H2H)
              </h2>
              <p className="text-xs text-gray-400 max-w-2xl">
                Aquí se listan los enfrentamientos directos simulados que has guardado desde el **Simulador H2H**. Puedes cargar la predicción en el comparador para analizarla a fondo con la matriz de calor.
              </p>
            </div>
          </div>

          {/* Tabla/Lista de Predicciones Guardadas */}
          <div className="glass-panel rounded-2xl p-5 shadow-2xl space-y-4">
            {savedPredictions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedPredictions.map((p) => (
                  <div
                    key={p.id}
                    className="bg-darkCard/50 border border-white/5 hover:border-brandGold/20 rounded-xl p-4 flex items-center justify-between gap-4 transition-all duration-200"
                  >
                    <div className="space-y-1 truncate flex-1 mr-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white truncate">
                        <span className="truncate">{p.teamAName}</span>
                        <span className="text-gray-500 font-mono text-3xs font-normal flex-shrink-0">vs</span>
                        <span className="truncate">{p.teamBName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-3xs text-gray-400 font-mono">
                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-gray-500 text-3xs flex-shrink-0">
                          {p.modelType === 'dixon_coles' ? 'Dixon-Coles' : 'Poisson'}
                        </span>
                        <span className="flex-shrink-0">Goles: {p.expectedGoalsA} - {p.expectedGoalsB}</span>
                        <span className="text-brandGold flex-shrink-0 font-semibold">
                          {(p.probWinA * 100).toFixed(0)}% / {(p.probDraw * 100).toFixed(0)}% / {(p.probWinB * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onLoadH2H(p.teamAId, p.teamBId, p.modelType)}
                        title="Cargar y abrir en comparador"
                        className="p-2.5 bg-brandGold/10 hover:bg-brandGold/20 rounded-lg text-brandGold transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-brandGold/25" />
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(p.id)}
                        title="Eliminar del historial"
                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500 font-mono text-xs space-y-2">
                <div>No tienes predicciones guardadas en tu historial.</div>
                <div className="text-3xs text-gray-600 max-w-xs mx-auto">
                  Ve a la pestaña "Simulador H2H", realiza simulaciones y haz clic en "Guardar en mi Historial H2H" para guardarlas aquí.
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
