const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface MatchUpdatePayload {
  match_id: number;
  team_a_score: number;
  team_b_score: number;
  status?: string;
}

export interface PredictMatchResponse {
  team_a: string;
  team_b: string;
  expected_goals_a: number;
  expected_goals_b: number;
  prob_win_a: number;
  prob_draw: number;
  prob_win_b: number;
  score_matrix: number[][];
}

export async function fetchTeams() {
  const res = await fetch(`${BASE_URL}/api/teams`);
  if (!res.ok) throw new Error('Error al cargar equipos de la API');
  return res.json();
}

export async function fetchMatches() {
  const res = await fetch(`${BASE_URL}/api/matches`);
  if (!res.ok) throw new Error('Error al cargar partidos de la API');
  return res.json();
}

export async function updateMatchScore(payload: MatchUpdatePayload) {
  const res = await fetch(`${BASE_URL}/api/matches/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Error al actualizar el partido');
  return res.json();
}

export async function predictMatch(teamAId: string, teamBId: string, modelType: string = 'dixon_coles'): Promise<PredictMatchResponse> {
  const res = await fetch(`${BASE_URL}/api/predict-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_a_id: teamAId, team_b_id: teamBId, model_type: modelType })
  });
  if (!res.ok) throw new Error('Error al predecir el partido');
  return res.json();
}

export async function simulateTournament(numSimulations: number = 10000, modelType: string = 'dixon_coles') {
  const res = await fetch(`${BASE_URL}/api/simulate-tournament`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ num_simulations: numSimulations, model_type: modelType })
  });
  if (!res.ok) throw new Error('Error al simular el torneo');
  return res.json();
}

export async function fetchSimulationStats() {
  const res = await fetch(`${BASE_URL}/api/simulation-stats`);
  if (!res.ok) throw new Error('Error al cargar estadísticas de simulación');
  return res.json();
}

export async function fetchSimulationHistory() {
  const res = await fetch(`${BASE_URL}/api/simulation-history`);
  if (!res.ok) throw new Error('Error al cargar el historial de simulaciones');
  return res.json();
}
