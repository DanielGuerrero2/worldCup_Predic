import { useState, useEffect } from 'react';
import { predictMatch, PredictMatchResponse } from '../lib/api';
import { Target, TrendingUp, AlertTriangle, Bookmark, Trash2, History, Play } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  group_letter: string;
  fifa_ranking: number;
  elo_rating: number;
}

interface MatchCenterProps {
  teams: Team[];
  initialTeamA?: string;
  initialTeamB?: string;
  initialModel?: string;
  onStateChange?: (teamA: string, teamB: string, model: string) => void;
}

interface SavedPrediction {
  id: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  modelType: string;
  expectedGoalsA: number;
  expectedGoalsB: number;
  probWinA: number;
  probDraw: number;
  probWinB: number;
  timestamp: string;
}

export default function MatchCenter({
  teams,
  initialTeamA,
  initialTeamB,
  initialModel,
  onStateChange
}: MatchCenterProps) {
  const [teamAId, setTeamAId] = useState<string>(initialTeamA || 'MEX');
  const [teamBId, setTeamBId] = useState<string>(initialTeamB || 'USA');
  const [modelType, setModelType] = useState<string>(initialModel || 'dixon_coles');
  const [prediction, setPrediction] = useState<PredictMatchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar estados con propiedades cuando cambien
  useEffect(() => {
    if (initialTeamA && initialTeamA !== teamAId) {
      setTeamAId(initialTeamA);
    }
  }, [initialTeamA]);

  useEffect(() => {
    if (initialTeamB && initialTeamB !== teamBId) {
      setTeamBId(initialTeamB);
    }
  }, [initialTeamB]);

  useEffect(() => {
    if (initialModel && initialModel !== modelType) {
      setModelType(initialModel);
    }
  }, [initialModel]);

  // Si la combinación inicial es distinta a la por defecto al montar, predecir automáticamente
  useEffect(() => {
    if (initialTeamA && initialTeamB && (initialTeamA !== 'MEX' || initialTeamB !== 'USA')) {
      handlePredictDirectly(initialTeamA, initialTeamB, initialModel || 'dixon_coles');
    }
  }, [initialTeamA, initialTeamB, initialModel]);

  const handlePredictDirectly = async (ta: string, tb: string, model: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await predictMatch(ta, tb, model);
      setPrediction(data);
    } catch (e) {
      setError('Error al obtener la predicción.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const [savedPredictions, setSavedPredictions] = useState<SavedPrediction[]>(() => {
    try {
      const saved = localStorage.getItem('wc2026_h2h_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handlePredict = async () => {
    if (teamAId === teamBId) {
      setError('Debes seleccionar dos selecciones diferentes.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await predictMatch(teamAId, teamBId, modelType);
      setPrediction(data);
    } catch (e: any) {
      setError('Error al obtener la predicción. Asegúrate de tener el backend corriendo.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToHistory = () => {
    if (!prediction) return;

    const isDuplicate = savedPredictions.some(
      (p) => p.teamAId === teamAId && p.teamBId === teamBId && p.modelType === modelType
    );
    if (isDuplicate) {
      alert('Esta predicción ya se encuentra guardada en tu historial.');
      return;
    }

    const newSaved: SavedPrediction = {
      id: Date.now().toString(),
      teamAId,
      teamBId,
      teamAName: prediction.team_a,
      teamBName: prediction.team_b,
      modelType,
      expectedGoalsA: prediction.expected_goals_a,
      expectedGoalsB: prediction.expected_goals_b,
      probWinA: prediction.prob_win_a,
      probDraw: prediction.prob_draw,
      probWinB: prediction.prob_win_b,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newSaved, ...savedPredictions];
    setSavedPredictions(updated);
    localStorage.setItem('wc2026_h2h_history', JSON.stringify(updated));
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedPredictions.filter((p) => p.id !== id);
    setSavedPredictions(updated);
    localStorage.setItem('wc2026_h2h_history', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    if (window.confirm('¿Estás seguro de que deseas vaciar el historial de predicciones guardadas?')) {
      setSavedPredictions([]);
      localStorage.removeItem('wc2026_h2h_history');
    }
  };

  const handleLoadSaved = (p: SavedPrediction) => {
    setTeamAId(p.teamAId);
    setTeamBId(p.teamBId);
    setModelType(p.modelType);
    onStateChange?.(p.teamAId, p.teamBId, p.modelType);

    setLoading(true);
    setError(null);
    predictMatch(p.teamAId, p.teamBId, p.modelType)
      .then((data) => {
        setPrediction(data);
      })
      .catch((err) => {
        setError('Error al recargar la predicción.');
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="space-y-6 animate-scaleUp">
      <div className="glass-panel rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="text-brandBlue w-5 h-5" />
          Simulador de Enfrentamiento Directo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-3xs font-bold uppercase tracking-wider text-gray-400">Selección A</label>
            <select
              value={teamAId}
              onChange={(e) => {
                const val = e.target.value;
                setTeamAId(val);
                onStateChange?.(val, teamBId, modelType);
              }}
              className="bg-darkCard border border-white/10 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brandBlue transition-all cursor-pointer"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Gr. {t.group_letter})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-3xs font-bold uppercase tracking-wider text-gray-400">Selección B</label>
            <select
              value={teamBId}
              onChange={(e) => {
                const val = e.target.value;
                setTeamBId(val);
                onStateChange?.(teamAId, val, modelType);
              }}
              className="bg-darkCard border border-white/10 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brandBlue transition-all cursor-pointer"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Gr. {t.group_letter})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-3xs font-bold uppercase tracking-wider text-gray-400">Modelo Predictivo</label>
            <select
              value={modelType}
              onChange={(e) => {
                const val = e.target.value;
                setModelType(val);
                onStateChange?.(teamAId, teamBId, val);
              }}
              className="bg-darkCard border border-white/10 rounded-xl p-3 text-xs font-semibold text-white focus:outline-none focus:border-brandBlue transition-all cursor-pointer"
            >
              <option value="dixon_coles">Poisson + Dixon-Coles</option>
              <option value="poisson">Poisson Puro</option>
            </select>
          </div>

          <div>
            <button
              onClick={handlePredict}
              disabled={loading}
              className="w-full bg-brandBlue hover:bg-brandBlue/90 active:scale-95 transition-all text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-brandBlue/35 text-glow-blue flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none text-xs"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                'Predecir Partido'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {prediction && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-brandNeon" />
                Probabilidades del Partido
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Gana {prediction.team_a}</span>
                    <span className="font-mono text-brandBlue font-bold">{(prediction.prob_win_a * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-brandBlue h-full rounded-full transition-all duration-1000" style={{ width: `${prediction.prob_win_a * 100}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Empate</span>
                    <span className="font-mono text-gray-400 font-bold">{(prediction.prob_draw * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gray-500 h-full rounded-full transition-all duration-1000" style={{ width: `${prediction.prob_draw * 100}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Gana {prediction.team_b}</span>
                    <span className="font-mono text-brandNeon font-bold">{(prediction.prob_win_b * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-brandNeon h-full rounded-full transition-all duration-1000" style={{ width: `${prediction.prob_win_b * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 shadow-xl flex justify-around items-center text-center">
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Goles Esperados</span>
                <span className="text-3xl font-extrabold text-brandBlue font-mono text-glow-blue">{prediction.expected_goals_a}</span>
                <span className="text-2xs text-gray-500 block mt-1">{prediction.team_a}</span>
              </div>
              <div className="h-10 w-[1px] bg-white/10"></div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Goles Esperados</span>
                <span className="text-3xl font-extrabold text-brandNeon font-mono text-glow-neon">{prediction.expected_goals_b}</span>
                <span className="text-2xs text-gray-500 block mt-1">{prediction.team_b}</span>
              </div>
            </div>

            <button
              onClick={handleSaveToHistory}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brandGold/30 text-gray-300 hover:text-brandGold py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200"
            >
              <Bookmark className="w-4.5 h-4.5" />
              Guardar en mi Historial H2H
            </button>
          </div>

          <div className="lg:col-span-3 glass-panel rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
              Mapa de Calor: Probabilidad de Marcador Exacto (%)
            </h3>

            <div className="overflow-x-auto flex-1 flex flex-col justify-center">
              <div className="min-w-[450px]">
                <div className="grid grid-cols-8 text-center text-xs font-bold font-mono text-gray-500 border-b border-white/5 pb-2 mb-2">
                  <div>A \ B</div>
                  {prediction.score_matrix[0].map((_, colIdx) => (
                    <div key={colIdx} className="text-brandNeon">{colIdx}</div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  {prediction.score_matrix.map((row, rowIdx) => (
                    <div key={rowIdx} className="grid grid-cols-8 gap-1.5 text-center items-center">
                      <div className="text-xs font-bold font-mono text-brandBlue">{rowIdx}</div>
                      {row.map((val, colIdx) => {
                        const pct = val * 100;
                        const opacity = Math.min(1.0, val * 6.5);
                        const colorBg = pct > 0.5 
                          ? `rgba(157, 78, 221, ${opacity})`
                          : 'rgba(255, 255, 255, 0.02)';

                        return (
                          <div
                            key={colIdx}
                            style={{ backgroundColor: colorBg }}
                            className="h-10 rounded-lg flex flex-col items-center justify-center font-mono text-2xs transition-all hover:scale-105 border border-white/5 group relative cursor-help"
                          >
                            <span className={pct > 5 ? 'text-white font-bold text-shadow-sm' : 'text-gray-400'}>
                              {pct.toFixed(1)}%
                            </span>
                            <span className="pointer-events-none absolute -top-8 bg-darkBg text-white text-3xs font-mono font-bold px-2 py-1 rounded shadow-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                              {prediction.team_a} {rowIdx} - {colIdx} {prediction.team_b}: {pct.toFixed(2)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 text-3xs text-gray-500 font-mono text-right">
              Filas = Goles de {prediction.team_a} | Columnas = Goles de {prediction.team_b}
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-brandGold flex items-center gap-2">
            <History className="w-4.5 h-4.5" />
            Historial de Predicciones Guardadas H2H ({savedPredictions.length})
          </h3>
          {savedPredictions.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-3xs font-mono text-red-400 hover:text-red-300 font-bold uppercase transition-colors"
            >
              Vaciar Historial
            </button>
          )}
        </div>

        {savedPredictions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
            {savedPredictions.map((p) => (
              <div
                key={p.id}
                className="bg-darkCard/50 border border-white/5 hover:border-brandGold/20 rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all duration-200"
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
                    <span className="text-brandGold flex-shrink-0">
                      {(p.probWinA * 100).toFixed(0)}% / {(p.probDraw * 100).toFixed(0)}% / {(p.probWinB * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleLoadSaved(p)}
                    title="Cargar y simular"
                    className="p-2 bg-brandGold/10 hover:bg-brandGold/20 rounded-lg text-brandGold transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-brandGold/25" />
                  </button>
                  <button
                    onClick={() => handleDeleteSaved(p.id)}
                    title="Eliminar del historial"
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 font-mono text-2xs">
            No tienes predicciones guardadas en tu historial H2H.
          </div>
        )}
      </div>
    </div>
  );
}
