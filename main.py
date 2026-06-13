import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from database import get_teams, get_matches, update_match_score, update_simulation_stats, get_simulation_stats, insert_simulation_run, get_simulation_history
from predictor import MatchPredictor
from simulator import TournamentSimulator

app = FastAPI(
    title="FIFA World Cup 2026 Prediction API",
    description="Backend de predicciones y simulaciones usando Dixon-Coles y Monte Carlo para el Mundial 2026",
    version="1.0.0"
)

# Configuración de CORS para permitir la conexión desde el frontend de React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción se debe limitar al dominio del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar componentes
predictor = MatchPredictor()
simulator = TournamentSimulator()

# Esquemas de datos con Pydantic
class MatchUpdatePayload(BaseModel):
    match_id: int
    team_a_score: Optional[int] = None
    team_b_score: Optional[int] = None
    status: Optional[str] = "completed"

class PredictMatchPayload(BaseModel):
    team_a_id: str
    team_b_id: str
    model_type: Optional[str] = "dixon_coles"

class SimulationPayload(BaseModel):
    num_simulations: Optional[int] = 10000
    model_type: Optional[str] = "dixon_coles"

@app.get("/")
def read_root():
    return {"message": "API del Predictor del Mundial 2026 corriendo correctamente."}

@app.get("/api/teams")
def api_get_teams():
    teams = get_teams()
    if not teams:
        raise HTTPException(status_code=500, detail="No se pudieron cargar las selecciones de la base de datos.")
    return teams

@app.get("/api/matches")
def api_get_matches():
    matches = get_matches()
    if not matches:
        raise HTTPException(status_code=500, detail="No se pudieron cargar los partidos de SQLite.")
    return matches

@app.get("/api/simulation-stats")
def api_get_simulation_stats():
    stats = get_simulation_stats()
    return stats

@app.post("/api/matches/update")
def api_update_match(payload: MatchUpdatePayload):
    result = update_match_score(
        match_id=payload.match_id,
        team_a_score=payload.team_a_score,
        team_b_score=payload.team_b_score,
        status=payload.status
    )
    if not result:
        raise HTTPException(status_code=400, detail="No se pudo actualizar el marcador en la base de datos.")
    return {"status": "success", "data": result}

@app.post("/api/predict-match")
def api_predict_match(payload: PredictMatchPayload):
    teams = get_teams()
    teams_map = {t['id']: t for t in teams}
    
    if payload.team_a_id not in teams_map or payload.team_b_id not in teams_map:
        raise HTTPException(status_code=404, detail="Una o ambas selecciones no existen.")
        
    team_a = teams_map[payload.team_a_id]
    team_b = teams_map[payload.team_b_id]
    
    # Evaluar ventajas de localía
    is_home_a = team_a['id'] in ['USA', 'MEX', 'CAN']
    is_home_b = team_b['id'] in ['USA', 'MEX', 'CAN']
    
    grid, lambda_a, lambda_b = predictor.predict_match(
        attack_a=team_a['attack_strength'],
        defense_a=team_a['defense_strength'],
        attack_b=team_b['attack_strength'],
        defense_b=team_b['defense_strength'],
        is_home_a=is_home_a,
        is_home_b=is_home_b,
        use_dixon_coles=(payload.model_type == "dixon_coles")
    )
    
    win_a, draw, win_b = predictor.get_outcome_probabilities(grid)
    
    # Preparar la grilla para la respuesta JSON (máx goles 6 en la matriz de salida por facilidad de visualización en la UI)
    limited_grid = []
    for x in range(min(7, grid.shape[0])):
        row = []
        for y in range(min(7, grid.shape[1])):
            row.append(round(float(grid[x, y]), 4))
        limited_grid.append(row)
        
    return {
        "team_a": team_a['name'],
        "team_b": team_b['name'],
        "expected_goals_a": round(float(lambda_a), 2),
        "expected_goals_b": round(float(lambda_b), 2),
        "prob_win_a": round(float(win_a), 4),
        "prob_draw": round(float(draw), 4),
        "prob_win_b": round(float(win_b), 4),
        "score_matrix": limited_grid
    }

@app.post("/api/simulate-tournament")
def api_simulate_tournament(payload: SimulationPayload):
    teams = get_teams()
    matches = get_matches()
    
    if not teams or not matches:
        raise HTTPException(status_code=500, detail="No hay datos suficientes en la base de datos para correr la simulación.")
        
    # Limitar las simulaciones a un rango seguro de rendimiento (100 a 25,000)
    num_runs = max(100, min(25000, payload.num_simulations or 10000))
    
    # Ejecutar simulación
    try:
        sim_stats = simulator.run_monte_carlo_simulation(
            all_teams=teams,
            all_matches=matches,
            num_simulations=num_runs,
            model_type=payload.model_type or "dixon_coles"
        )
        
        # Actualizar datos en SQLite
        update_result = update_simulation_stats(sim_stats)
        if not update_result:
            raise HTTPException(status_code=500, detail="La simulación se ejecutó pero falló al guardarse en SQLite.")
            
        # Calcular y guardar en el historial
        try:
            import json
            sorted_stats = sorted(sim_stats, key=lambda x: x['champion_prob'], reverse=True)
            top_5 = sorted_stats[:5]
            teams_map = {t['id']: t['name'] for t in teams}
            top_contenders_list = []
            for item in top_5:
                top_contenders_list.append({
                    "team_id": item['team_id'],
                    "team_name": teams_map.get(item['team_id'], item['team_id']),
                    "champion_prob": item['champion_prob']
                })
            
            insert_simulation_run(
                num_simulations=num_runs,
                model_type=payload.model_type or "dixon_coles",
                top_contenders=json.dumps(top_contenders_list)
            )
        except Exception as eh:
            print(f"Error al guardar historial de simulación: {eh}")
            
        return {
            "status": "success",
            "simulations_run": num_runs,
            "data": sim_stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante la simulación: {str(e)}")

@app.get("/api/simulation-history")
def api_get_simulation_history():
    history = get_simulation_history()
    return history
