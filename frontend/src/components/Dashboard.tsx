import { useState } from 'react';
import { simulateTournament } from '../lib/api';
import { Play, TrendingUp, Trophy, Sparkles, History } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  group_letter: string;
  fifa_ranking: number;
  elo_rating: number;
}

interface SimStat {
  team_id: string;
  champion_prob: number;
  finalist_prob: number;
  sf_prob: number;
  qf_prob: number;
  r16_prob: number;
  r32_prob: number;
  teams?: Team; // Join de SQLite / Backend
}

interface DashboardProps {
  teams: Team[];
  stats: SimStat[];
  simHistory: any[];
  onRefreshStats: () => void;
}

export default function Dashboard({ teams, stats, simHistory, onRefreshStats }: DashboardProps) {
  const [numSims, setNumSims] = useState<number>(10000);
  const [modelType, setModelType] = useState<string>('dixon_coles');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [percent, setPercent] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');

  const handleRunSimulation = async () => {
    setSimulating(true);
    setPercent(0);
    setProgressText('Inicializando motor de simulación...');
    
    // El motor tarda unos 2.66 ms por corrida de torneo completo en local
    const totalExpectedMs = numSims * 2.66;
    const intervalMs = 100;
    const totalSteps = totalExpectedMs / intervalMs;
    const increment = 95 / totalSteps;
    
    const interval = setInterval(() => {
      setPercent(prev => {
        const next = prev + increment;
        if (next >= 95) {
          clearInterval(interval);
          return 95;
        }
        
        // Actualizar textos informativos dinámicos de lo que hace el backend
        if (next < 25) {
          setProgressText(`Simulando fase de grupos... (${Math.round(next)}%)`);
        } else if (next < 50) {
          setProgressText(`Calculando posiciones y desempates... (${Math.round(next)}%)`);
        } else if (next < 75) {
          setProgressText(`Cargando cruces de mejores terceros (Anexo C)... (${Math.round(next)}%)`);
        } else {
          setProgressText(`Ejecutando eliminatorias (Ronda de 32 a Final)... (${Math.round(next)}%)`);
        }
        
        return next;
      });
    }, intervalMs);

    try {
      await simulateTournament(numSims, modelType);
      clearInterval(interval);
      setPercent(100);
      setProgressText('Simulación completada. Guardando estadísticas...');
      
      setTimeout(() => {
        onRefreshStats();
        setSimulating(false);
        setPercent(0);
        setProgressText('');
      }, 1200);
    } catch (e) {
      clearInterval(interval);
      console.error(e);
      alert('Error al ejecutar la simulación. Verifica que el backend de FastAPI esté activo.');
      setSimulating(false);
      setPercent(0);
      setProgressText('');
    }
  };



  // Combinar los stats con los datos de las selecciones si no viene el join hecho
  const populatedStats = stats.map(s => {
    const teamInfo = s.teams || teams.find(t => t.id === s.team_id);
    return {
      ...s,
      team_name: teamInfo?.name || s.team_id,
      group_letter: teamInfo?.group_letter || '-'
    };
  }).sort((a, b) => b.champion_prob - a.champion_prob);

  const topContenders = populatedStats.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Controles de Simulación y Panel Informativo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Launcher Simulación */}
        <div className="glass-panel rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden pulse-glow">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Sparkles className="w-20 h-20 text-brandGold" />
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Play className="text-brandGold w-5 h-5 fill-brandGold" />
              Simular Mundial
            </h2>
            <p className="text-xs text-gray-400">
              Ejecuta una simulación masiva de Monte Carlo. El motor simulará probabilísticamente todos los partidos pendientes utilizando la distribución de Poisson y cruzará la Ronda de 32 según el Anexo C de la FIFA.
            </p>

            <div className="flex flex-col gap-1.5 pt-2">
              <label className="text-3xs font-bold uppercase tracking-wider text-gray-500">Cantidad de Corridas</label>
              <select
                value={numSims}
                onChange={(e) => setNumSims(Number(e.target.value))}
                disabled={simulating}
                className="bg-darkCard border border-white/10 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-brandGold transition-all cursor-pointer"
              >
                <option value={1000}>1,000 simulaciones (Rápido)</option>
                <option value={5000}>5,000 simulaciones (Recomendado)</option>
                <option value={10000}>10,000 simulaciones (Preciso)</option>
                <option value={20000}>20,000 simulaciones (Ultra Preciso)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 pt-2">
              <label className="text-3xs font-bold uppercase tracking-wider text-gray-500">Modelo de Predicción</label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                disabled={simulating}
                className="bg-darkCard border border-white/10 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-brandGold transition-all cursor-pointer"
              >
                <option value="dixon_coles">Poisson + Dixon-Coles</option>
                <option value="poisson">Poisson Puro</option>
              </select>
            </div>
          </div>

          <div className="pt-6 space-y-4">
            {!simulating ? (
              <button
                onClick={handleRunSimulation}
                id="btn-run-simulation"
                className="w-full bg-brandGold hover:bg-brandGold/90 active:scale-95 transition-all text-darkBg font-extrabold py-3.5 px-6 rounded-xl shadow-lg shadow-brandGold/20 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-darkBg" />
                Iniciar Simulación
              </button>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-3xs font-mono">
                  <span className="text-gray-400 animate-pulse truncate max-w-[80%]">{progressText}</span>
                  <span className="font-bold text-brandGold">{Math.round(percent)}%</span>
                </div>
                {/* Contenedor de la barra de progreso */}
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                  <div
                    className="h-full bg-gradient-to-r from-brandBlue via-brandNeon to-brandGold rounded-full transition-all duration-100 ease-out shadow-[0_0_8px_rgba(247,184,1,0.3)]"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Favoritos al Título */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="text-brandGold w-5 h-5" />
            Top 5 Favoritos Proyectados
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {topContenders.length > 0 && topContenders[0].champion_prob > 0 ? (
              topContenders.map((item, idx) => (
                <div
                  key={item.team_id}
                  className="bg-darkCard/40 border border-white/5 p-4 rounded-xl text-center space-y-2 flex flex-col justify-between relative"
                >
                  <span className="absolute top-2 left-2 text-2xs font-mono font-bold text-gray-500">#{idx + 1}</span>
                  <div className="text-3xl py-1">🏆</div>
                  <div>
                    <span className="font-bold text-xs block truncate">{item.team_name}</span>
                    <span className="text-3xs text-gray-500 uppercase font-mono block">Grupo {item.group_letter}</span>
                  </div>
                  <div className="bg-brandGold/10 text-brandGold border border-brandGold/20 py-1 rounded text-xs font-mono font-bold">
                    {(item.champion_prob * 100).toFixed(1)}%
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-500 font-mono text-sm">
                No hay estadísticas de simulación. Ejecuta la simulación para calcular el top de favoritos.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Simulaciones de Monte Carlo */}
      {simHistory && simHistory.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-4 animate-fadeIn">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <History className="text-brandGold w-4.5 h-4.5" />
            Historial de Ejecuciones de Monte Carlo ({simHistory.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[200px] overflow-y-auto pr-1">
            {simHistory.map((run) => {
              let contenders = [];
              try {
                contenders = JSON.parse(run.top_contenders);
              } catch (e) {
                console.error(e);
              }
              
              // Ajustar la hora local a partir de la marca UTC
              const dateStr = new Date(run.timestamp + 'Z').toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={run.id} className="bg-darkCard/40 border border-white/5 p-3.5 rounded-xl space-y-2 flex flex-col justify-between hover:border-brandGold/20 transition-all duration-200">
                  <div className="flex justify-between items-center">
                    <span className="text-3xs font-mono text-gray-500">{dateStr}</span>
                    <span className="bg-white/5 px-2 py-0.5 rounded text-3xs font-mono text-gray-400 uppercase">
                      {run.model_type === 'dixon_coles' ? 'Dixon-Coles' : 'Poisson'}
                    </span>
                  </div>
                  <div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-gray-500 block">Favorito Proyectado:</span>
                    {contenders.length > 0 ? (
                      <span className="text-xs font-bold text-brandGold block mt-0.5">
                        🏆 {contenders[0].team_name} ({(contenders[0].champion_prob * 100).toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 block">-</span>
                    )}
                  </div>
                  <div className="border-t border-white/5 pt-1.5 flex justify-between items-center text-3xs font-mono text-gray-500">
                    <span>Corrida #{run.id}</span>
                    <span>N={run.num_simulations.toLocaleString()} sims</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabla Global de Probabilidades */}
      <div className="glass-panel rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="text-brandBlue w-5 h-5" />
            Probabilidades Globales por Selección (%)
          </h2>
          <span className="text-3xs font-mono text-gray-500">
            Ordenado por Probabilidad de Campeón (Monte Carlo)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-3xs uppercase font-semibold">
                <th className="py-3 px-3">Selección</th>
                <th className="py-3 px-3 text-center">Grupo</th>
                <th className="py-3 px-3 text-center">Clasifica R32</th>
                <th className="py-3 px-3 text-center">Octavos (R16)</th>
                <th className="py-3 px-3 text-center">Cuartos (QF)</th>
                <th className="py-3 px-3 text-center">Semis (SF)</th>
                <th className="py-3 px-3 text-center">Finalista</th>
                <th className="py-3 px-4 text-center font-bold text-brandGold text-2xs">Campeón</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {populatedStats.length > 0 && populatedStats.some(s => s.champion_prob > 0) ? (
                populatedStats.map((item) => (
                  <tr key={item.team_id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-semibold text-gray-100 flex items-center gap-2">
                      <span className="font-mono text-gray-500 w-8">{item.team_id}</span>
                      <span>{item.team_name}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-gray-400">
                      {item.group_letter}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold">
                      {(item.r32_prob * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold">
                      {(item.r16_prob * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold">
                      {(item.qf_prob * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold">
                      {(item.sf_prob * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold">
                      {(item.finalist_prob * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-extrabold text-brandGold text-sm bg-brandGold/5 text-glow-gold">
                      {(item.champion_prob * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500 font-mono text-sm">
                    No se han registrado simulaciones. Inicia la simulación para poblar esta tabla.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
