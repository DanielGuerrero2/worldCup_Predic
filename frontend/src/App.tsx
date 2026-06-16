import { useEffect, useState } from 'react';
import { fetchTeams, fetchMatches, updateMatchScore, fetchSimulationStats, fetchSimulationHistory } from './lib/api';
import Dashboard from './components/Dashboard';
import GroupStages from './components/GroupStages';
import Bracket from './components/Bracket';
import MatchCenter from './components/MatchCenter';
import MyPredictions from './components/MyPredictions';
import { Trophy, Calendar, Target, LayoutDashboard, X, History } from 'lucide-react';

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

interface SimStat {
  team_id: string;
  champion_prob: number;
  finalist_prob: number;
  sf_prob: number;
  qf_prob: number;
  r16_prob: number;
  r32_prob: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GROUPS' | 'BRACKET' | 'MATCH_CENTER' | 'PREDICTIONS'>('DASHBOARD');
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<SimStat[]>([]);
  const [simHistory, setSimHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // States para compartir la selección de H2H
  const [h2hTeamA, setH2hTeamA] = useState<string>('MEX');
  const [h2hTeamB, setH2hTeamB] = useState<string>('USA');
  const [h2hModel, setH2hModel] = useState<string>('dixon_coles');

  // States para modal de actualización de marcador
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [savingScore, setSavingScore] = useState<boolean>(false);

  // Cargar datos al montar
  const loadData = async () => {
    try {
      const teamsData = await fetchTeams();
      const matchesData = await fetchMatches();
      setTeams(teamsData);
      setMatches(matchesData);

      // Intentar cargar estadísticas de simulación
      const statsData = await fetchSimulationStats();
      if (statsData) {
        setStats(statsData as SimStat[]);
      }

      // Cargar historial de simulación
      const historyData = await fetchSimulationHistory();
      if (historyData) {
        setSimHistory(historyData);
      }
    } catch (e) {
      console.error("Error cargando datos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenMatchModal = (match: Match) => {
    setSelectedMatch(match);
    setScoreA(match.team_a_score ?? 0);
    setScoreB(match.team_b_score ?? 0);
  };

  const handleSaveMatchScore = async () => {
    if (!selectedMatch) return;
    setSavingScore(true);
    try {
      await updateMatchScore({
        match_id: selectedMatch.id,
        team_a_score: scoreA,
        team_b_score: scoreB,
        status: 'completed'
      });

      // Actualizar matches locales
      setMatches(prev => prev.map(m => m.id === selectedMatch.id ? {
        ...m,
        team_a_score: scoreA,
        team_b_score: scoreB,
        status: 'completed'
      } : m));

      setSelectedMatch(null);
    } catch (e) {
      console.error(e);
      alert('No se pudo guardar el marcador. ¿El servidor FastAPI está encendido?');
    } finally {
      setSavingScore(false);
    }
  };

  const handleResetMatch = async (matchId: number) => {
    try {
      await updateMatchScore({
        match_id: matchId,
        team_a_score: null as any,
        team_b_score: null as any,
        status: 'scheduled'
      });

      setMatches(prev => prev.map(m => m.id === matchId ? {
        ...m,
        team_a_score: null,
        team_b_score: null,
        status: 'scheduled'
      } : m));
    } catch (e) {
      console.error(e);
      alert('Error al resetear el partido. Verifica que el backend esté activo.');
    }
  };

  const handleResetAllUserPredictions = async () => {
    if (!window.confirm('¿Estás seguro de que quieres borrar todas tus predicciones personalizadas? Los resultados oficiales de las Jornadas 1, 2 y 3 se mantendrán.')) {
      return;
    }

    const officialMatchIds = [
      1, 2,     // Día 1: Grupo A
      7, 8,     // Día 2: Grupo B
      13, 14,   // Día 2: Grupo C
      19, 20,   // Día 3: Grupo D
      25, 26,   // Día 4: Grupo E
      31, 32,   // Día 4: Grupo F
      37, 38,   // Día 5: Grupo G
      43, 44,   // Día 5: Grupo H
    ];
    const userPredictedMatches = matches.filter(
      (m) => m.status === 'completed' && !officialMatchIds.includes(m.id)
    );

    try {
      await Promise.all(
        userPredictedMatches.map((m) =>
          updateMatchScore({
            match_id: m.id,
            team_a_score: null as any,
            team_b_score: null as any,
            status: 'scheduled'
          })
        )
      );

      setMatches(prev => prev.map(m => {
        if (m.status === 'completed' && !officialMatchIds.includes(m.id)) {
          return {
            ...m,
            team_a_score: null,
            team_b_score: null,
            status: 'scheduled'
          };
        }
        return m;
      }));
    } catch (e) {
      console.error(e);
      alert('Error al resetear las predicciones. Algunas podrían no haberse restablecido.');
    }
  };

  const handleApplyPrediction = async (matchId: number, scoreA: number, scoreB: number) => {
    try {
      await updateMatchScore({
        match_id: matchId,
        team_a_score: scoreA,
        team_b_score: scoreB,
        status: 'completed'
      });

      setMatches(prev => prev.map(m => m.id === matchId ? {
        ...m,
        team_a_score: scoreA,
        team_b_score: scoreB,
        status: 'completed'
      } : m));
    } catch (e) {
      console.error(e);
      alert('Error al aplicar la predicción en el backend.');
    }
  };

  const getTeamName = (id: string | null) => {
    if (!id) return 'Por definir';
    return teams.find(t => t.id === id)?.name || id;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-center">
        <div className="w-12 h-12 border-4 border-brandBlue border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-sm text-gray-400">Cargando base de datos del Mundial 2026...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center py-4 border-b border-white/5 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brandGold/10 p-2 rounded-xl border border-brandGold/25 text-brandGold animate-pulse">
            <Trophy className="w-8 h-8 fill-brandGold/10" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight uppercase text-glow-gold flex items-center gap-1.5 text-brandGold">
              Predictor Mundial 2026
            </h1>
            <span className="text-3xs font-mono text-gray-500 block">Dixon-Coles & Monte Carlo Prediction Engine</span>
          </div>
        </div>

        {/* Navbar */}
        <nav className="flex gap-1.5 bg-darkCard/50 border border-white/5 p-1 rounded-xl backdrop-blur-md">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${activeTab === 'DASHBOARD'
                ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/35 text-glow-blue'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('GROUPS')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${activeTab === 'GROUPS'
                ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/35 text-glow-blue'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <Calendar className="w-4 h-4" />
            Grupos
          </button>
          <button
            onClick={() => setActiveTab('BRACKET')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${activeTab === 'BRACKET'
                ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/35 text-glow-blue'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <Trophy className="w-4 h-4" />
            Bracket (Eliminatorias)
          </button>
          <button
            onClick={() => setActiveTab('MATCH_CENTER')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${activeTab === 'MATCH_CENTER'
                ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/35 text-glow-blue'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <Target className="w-4 h-4" />
            Simulador H2H
          </button>
          <button
            onClick={() => setActiveTab('PREDICTIONS')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${activeTab === 'PREDICTIONS'
                ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/35 text-glow-blue'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <History className="w-4 h-4" />
            Mis Predicciones
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8">
        {activeTab === 'DASHBOARD' && (
          <Dashboard teams={teams} stats={stats} simHistory={simHistory} onRefreshStats={loadData} />
        )}
        {activeTab === 'GROUPS' && (
          <GroupStages teams={teams} matches={matches} onSelectMatch={handleOpenMatchModal} />
        )}
        {activeTab === 'BRACKET' && (
          <Bracket teams={teams} matches={matches} onSelectMatch={handleOpenMatchModal} />
        )}
        {activeTab === 'MATCH_CENTER' && (
          <MatchCenter
            teams={teams}
            initialTeamA={h2hTeamA}
            initialTeamB={h2hTeamB}
            initialModel={h2hModel}
            onStateChange={(ta, tb, m) => {
              setH2hTeamA(ta);
              setH2hTeamB(tb);
              setH2hModel(m);
            }}
          />
        )}
        {activeTab === 'PREDICTIONS' && (
          <MyPredictions
            teams={teams}
            matches={matches}
            onResetMatch={handleResetMatch}
            onResetAllUserPredictions={handleResetAllUserPredictions}
            onSelectMatch={handleOpenMatchModal}
            onApplyPrediction={handleApplyPrediction}
            onLoadH2H={(ta, tb, m) => {
              setH2hTeamA(ta);
              setH2hTeamB(tb);
              setH2hModel(m);
              setActiveTab('MATCH_CENTER');
            }}
          />
        )}
      </main>

      {/* Modal de Marcador */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl p-6 relative border border-white/10 animate-scaleUp">
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold uppercase tracking-wider text-gray-400 mb-6 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brandNeon" />
              Editar Marcador del Partido #{selectedMatch.id}
            </h3>

            <div className="grid grid-cols-3 items-center gap-4 text-center">
              {/* Equipo A */}
              <div className="space-y-2">
                <span className="font-bold text-sm block truncate">{getTeamName(selectedMatch.team_a_id)}</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={scoreA}
                  onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 h-12 bg-darkCard border border-white/10 focus:border-brandBlue focus:outline-none rounded-xl text-center font-mono font-bold text-lg text-white mx-auto block"
                />
              </div>

              {/* Separador */}
              <div className="text-gray-600 font-mono text-xl font-bold">-</div>

              {/* Equipo B */}
              <div className="space-y-2">
                <span className="font-bold text-sm block truncate">{getTeamName(selectedMatch.team_b_id)}</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={scoreB}
                  onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 h-12 bg-darkCard border border-white/10 focus:border-brandBlue focus:outline-none rounded-xl text-center font-mono font-bold text-lg text-white mx-auto block"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setSelectedMatch(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 py-3 rounded-xl font-semibold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMatchScore}
                disabled={savingScore}
                className="flex-1 bg-brandBlue hover:bg-brandBlue/90 py-3 rounded-xl font-bold text-xs text-white text-glow-blue shadow-lg shadow-brandBlue/20 transition-colors"
              >
                {savingScore ? 'Guardando...' : 'Guardar Marcador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-6 border-t border-white/5 text-3xs font-mono text-gray-600 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>© 2026 FIFA World Cup Match Simulator. Desarrollado con  React, FastAPI y SQLite.</span>
        <span>Ajuste Dixon-Coles habilitado | Monte Carlo N=10K</span>
      </footer>
    </div>
  );
}
