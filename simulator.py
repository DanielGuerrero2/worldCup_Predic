import random
import numpy as np
from predictor import MatchPredictor

class TournamentSimulator:
    def __init__(self):
        self.predictor = MatchPredictor()
        
        # Mapeo de partidos de Ronda de 32 a 16avos de final
        # Formato: (ganador_match_x, ganador_match_y) para formar los emparejamientos de octavos
        self.r16_pairings = [
            (73, 74), (75, 76), (77, 78), (79, 80),
            (81, 82), (83, 84), (85, 86), (87, 88)
        ]
        
        # Mapeo de octavos a cuartos
        self.qf_pairings = [
            (89, 90), (91, 92), (93, 94), (95, 96)
        ]
        
        # Mapeo de cuartos a semis
        self.sf_pairings = [
            (97, 98), (99, 100)
        ]

    def assign_third_places(self, q_groups: list) -> dict:
        """
        Asigna de forma determinista los 8 mejores terceros lugares a sus cruces del Anexo C,
        satisfaciendo las restricciones de caminos oficiales de la FIFA y evitando que jueguen
        contra el ganador de su mismo grupo.
        """
        q_groups = sorted(list(q_groups))
        winners = ['WA', 'WB', 'WD', 'WE', 'WG', 'WI', 'WK', 'WL']
        
        # Grupos permitidos para cada ganador de grupo según el Anexo C
        allowed = {
            'WA': ['C', 'E', 'F', 'H', 'I'],
            'WB': ['E', 'F', 'G', 'I', 'J'],
            'WD': ['B', 'E', 'F', 'I', 'J'],
            'WE': ['A', 'B', 'C', 'D', 'F'],
            'WG': ['A', 'E', 'H', 'I', 'J'],
            'WI': ['C', 'D', 'F', 'G', 'H'],
            'WK': ['D', 'E', 'I', 'J', 'L'],
            'WL': ['E', 'H', 'I', 'J', 'K']
        }
        
        assignment = {}
        used = set()
        
        def backtrack(winner_idx):
            if winner_idx == len(winners):
                return True
                
            w = winners[winner_idx]
            for g in q_groups:
                if g not in used and g in allowed[w]:
                    assignment[w] = g
                    used.add(g)
                    if backtrack(winner_idx + 1):
                        return True
                    used.remove(g)
                    del assignment[w]
            return False

        if backtrack(0):
            return assignment
        else:
            # Fallback greedy en caso de que ocurra una combinación inesperada fuera del Anexo C
            assignment = {}
            used = set()
            for w in winners:
                matched = False
                for g in q_groups:
                    # w[1] representa la letra del grupo del ganador (ej: 'A' en 'WA')
                    if g not in used and g != w[1]: 
                        assignment[w] = g
                        used.add(g)
                        matched = True
                        break
                if not matched:
                    for g in q_groups:
                        if g not in used:
                            assignment[w] = g
                            used.add(g)
                            break
            return assignment

    def simulate_match_outcome(self, team_a: dict, team_b: dict, is_knockout: bool = False, use_dixon_coles: bool = True):
        """
        Simula el marcador de un partido usando las intensidades de Poisson del predictor.
        Retorna (goles_a, goles_b, ganador_id).
        """
        is_home_a = team_a['id'] in ['USA', 'MEX', 'CAN']
        is_home_b = team_b['id'] in ['USA', 'MEX', 'CAN']
        
        grid, lambda_a, lambda_b = self.predictor.predict_match(
            team_a['attack_strength'], team_a['defense_strength'],
            team_b['attack_strength'], team_b['defense_strength'],
            is_home_a=is_home_a, is_home_b=is_home_b,
            use_dixon_coles=use_dixon_coles
        )
        
        # Muestrear marcador de la grilla Dixon-Coles normalizada usando búsqueda binaria acumulativa (más rápido que np.random.choice)
        r = random.random()
        cumsum = grid.cumsum()
        selected_index = np.searchsorted(cumsum, r)
        goals_a = int(selected_index // grid.shape[1])
        goals_b = int(selected_index % grid.shape[1])
        
        if not is_knockout:
            if goals_a > goals_b:
                return goals_a, goals_b, team_a['id']
            elif goals_a < goals_b:
                return goals_a, goals_b, team_b['id']
            else:
                return goals_a, goals_b, None
        else:
            # Fase eliminatoria: resolver empates
            if goals_a > goals_b:
                return goals_a, goals_b, team_a['id']
            elif goals_a < goals_b:
                return goals_a, goals_b, team_b['id']
            else:
                # Simular tiempo extra (30 min = 1/3 de lambdas)
                lambda_a_et = lambda_a / 3.0
                lambda_b_et = lambda_b / 3.0
                et_goals_a = np.random.poisson(lambda_a_et)
                et_goals_b = np.random.poisson(lambda_b_et)
                
                total_a = goals_a + et_goals_a
                total_b = goals_b + et_goals_b
                
                if total_a > total_b:
                    return total_a, total_b, team_a['id']
                elif total_a < total_b:
                    return total_a, total_b, team_b['id']
                else:
                    # Simular tanda de penales
                    # Ponderación basada en el rating Elo (con ventaja sutil al de mayor Elo)
                    elo_diff = team_a['elo_rating'] - team_b['elo_rating']
                    prob_a_penalties = 0.5 + 0.05 * (elo_diff / 400.0)
                    prob_a_penalties = max(0.35, min(0.65, prob_a_penalties))
                    
                    if random.random() < prob_a_penalties:
                        return total_a, total_b, team_a['id']
                    else:
                        return total_a, total_b, team_b['id']

    def calculate_group_standings(self, group_teams: list, group_matches: list, simulated_results: dict) -> list:
        """
        Calcula la tabla de posiciones para un grupo específico.
        Retorna la lista de equipos del grupo ordenada por reglas oficiales.
        """
        standings = {t['id']: {'team': t, 'points': 0, 'gd': 0, 'gs': 0, 'wins': 0} for t in group_teams}
        
        # Procesar todos los partidos del grupo
        for m in group_matches:
            match_id = m['id']
            team_a_id = m['team_a_id']
            team_b_id = m['team_b_id']
            
            # Obtener goles reales o simulados
            if m['status'] == 'completed':
                goals_a = m['team_a_score']
                goals_b = m['team_b_score']
            else:
                sim_res = simulated_results.get(match_id)
                if sim_res:
                    goals_a, goals_b = sim_res['score_a'], sim_res['score_b']
                else:
                    goals_a, goals_b = 0, 0
            
            # Sumar estadísticas
            standings[team_a_id]['gs'] += goals_a
            standings[team_a_id]['gd'] += (goals_a - goals_b)
            standings[team_b_id]['gs'] += goals_b
            standings[team_b_id]['gd'] += (goals_b - goals_a)
            
            if goals_a > goals_b:
                standings[team_a_id]['points'] += 3
                standings[team_a_id]['wins'] += 1
            elif goals_a < goals_b:
                standings[team_b_id]['points'] += 3
                standings[team_b_id]['wins'] += 1
            else:
                standings[team_a_id]['points'] += 1
                standings[team_b_id]['points'] += 1

        # Criterios de ordenación:
        # 1. Puntos (descendente)
        # 2. Diferencia de goles (descendente)
        # 3. Goles anotados (descendente)
        # 4. Ranking FIFA (ascendente, ya que un menor valor ej: 1 es mejor)
        ranked = list(standings.values())
        ranked.sort(key=lambda x: (
            -x['points'],
            -x['gd'],
            -x['gs'],
            x['team']['fifa_ranking']
        ))
        
        return [item['team'] for item in ranked]

    def simulate_single_tournament(self, all_teams: list, all_matches: list, use_dixon_coles: bool = True) -> dict:
        """
        Simula una única ejecución completa del torneo (Fase de grupos + Eliminatorias).
        Retorna un diccionario indicando hasta qué ronda llegó cada equipo y el campeón final.
        """
        teams_map = {t['id']: t for t in all_teams}
        simulated_results = {}
        
        # 1. Simular Fase de Grupos
        group_matches = [m for m in all_matches if m['stage'] == 'group']
        for m in group_matches:
            if m['status'] == 'completed':
                continue
            team_a = teams_map[m['team_a_id']]
            team_b = teams_map[m['team_b_id']]
            goals_a, goals_b, winner_id = self.simulate_match_outcome(team_a, team_b, is_knockout=False, use_dixon_coles=use_dixon_coles)
            simulated_results[m['id']] = {
                'score_a': goals_a,
                'score_b': goals_b,
                'winner': winner_id
            }

        # 2. Calcular tablas de posiciones
        groups = {}
        for t in all_teams:
            groups.setdefault(t['group_letter'], []).append(t)
            
        group_standings = {}
        for g_letter, g_teams in groups.items():
            g_matches = [m for m in group_matches if m['group_letter'] == g_letter]
            group_standings[g_letter] = self.calculate_group_standings(g_teams, g_matches, simulated_results)

        # 3. Clasificar a la Ronda de 32
        r32_teams = {} # Guarda las posiciones del bracket (WA, RU, etc.)
        third_place_candidates = []
        
        for g_letter, standings in group_standings.items():
            # Primeros dos lugares avanzan directamente
            r32_teams[f'1{g_letter}'] = standings[0]
            r32_teams[f'2{g_letter}'] = standings[1]
            
            # El tercero califica como candidato a mejor tercero
            third_place_candidates.append(standings[2])

        # Ordenar terceros lugares para seleccionar los 8 mejores
        # Recalcular puntos, GD y GS específicos de estos terceros
        third_place_stats = []
        for t in third_place_candidates:
            g_matches = [m for m in group_matches if m['group_letter'] == t['group_letter']]
            standings_list = group_standings[t['group_letter']]
            
            # Buscar el registro de puntos, GD y GS del equipo que quedó en 3ra posición
            # Para esto calculamos su standing parcial
            stats = {'team': t, 'points': 0, 'gd': 0, 'gs': 0}
            for m in g_matches:
                match_id = m['id']
                if m['status'] == 'completed':
                    goals_a = m['team_a_score']
                    goals_b = m['team_b_score']
                else:
                    goals_a = simulated_results[match_id]['score_a']
                    goals_b = simulated_results[match_id]['score_b']
                
                if m['team_a_id'] == t['id']:
                    stats['gs'] += goals_a
                    stats['gd'] += (goals_a - goals_b)
                    if goals_a > goals_b: stats['points'] += 3
                    elif goals_a == goals_b: stats['points'] += 1
                elif m['team_b_id'] == t['id']:
                    stats['gs'] += goals_b
                    stats['gd'] += (goals_b - goals_a)
                    if goals_b > goals_a: stats['points'] += 3
                    elif goals_a == goals_b: stats['points'] += 1
            third_place_stats.append(stats)

        # Ordenar terceros lugares
        third_place_stats.sort(key=lambda x: (
            -x['points'],
            -x['gd'],
            -x['gs'],
            x['team']['fifa_ranking']
        ))
        
        best_thirds = [x['team'] for x in third_place_stats[:8]]
        q_groups = [t['group_letter'] for t in best_thirds]
        
        # Asignar los mejores terceros usando el algoritmo del Anexo C
        third_mapping = self.assign_third_places(q_groups)
        
        # Guardar en r32_teams usando los nombres del cruce
        # El mapeo entrega 'WA' -> 'C' (Winner A juega contra el 3ro del grupo C)
        # Así mapeamos f'3{third_mapping[WA]}' -> 'WA'
        third_by_winner = {}
        for winner_code, group_letter in third_mapping.items():
            # Encontrar el equipo 3ro calificado de ese grupo
            team_3rd = next(t for t in best_thirds if t['group_letter'] == group_letter)
            third_by_winner[winner_code] = team_3rd

        # 4. Simular Fase de Eliminación Directa
        # Guardamos en un diccionario los resultados de cada llave (match_id -> ganador)
        knockout_winners = {}
        
        # 4.1 Ronda de 32 (Matches 73 a 88)
        # Definición de cruces oficiales de R32
        r32_pairings = {
            73: (r32_teams['2A'], r32_teams['2B']),
            74: (r32_teams['1E'], third_by_winner['WE']),
            75: (r32_teams['1F'], r32_teams['2C']),
            76: (r32_teams['1C'], r32_teams['2F']),
            77: (r32_teams['1I'], third_by_winner['WI']),
            78: (r32_teams['2E'], r32_teams['2I']),
            79: (r32_teams['1A'], third_by_winner['WA']),
            80: (r32_teams['1L'], third_by_winner['WL']),
            81: (r32_teams['1D'], third_by_winner['WD']),
            82: (r32_teams['1G'], third_by_winner['WG']),
            83: (r32_teams['2K'], r32_teams['2L']),
            84: (r32_teams['1H'], r32_teams['2J']),
            85: (r32_teams['1B'], third_by_winner['WB']),
            86: (r32_teams['1J'], r32_teams['2H']),
            87: (r32_teams['1K'], third_by_winner['WK']),
            88: (r32_teams['2D'], r32_teams['2G'])
        }

        # Simular Ronda de 32
        for m_id, (team_a, team_b) in r32_pairings.items():
            _, _, winner_id = self.simulate_match_outcome(team_a, team_b, is_knockout=True, use_dixon_coles=use_dixon_coles)
            knockout_winners[m_id] = teams_map[winner_id]

        # 4.2 Octavos de Final (Matches 89 a 96)
        r16_winners = {}
        for idx, (m_a, m_b) in enumerate(self.r16_pairings):
            m_id = 89 + idx
            team_a = knockout_winners[m_a]
            team_b = knockout_winners[m_b]
            _, _, winner_id = self.simulate_match_outcome(team_a, team_b, is_knockout=True, use_dixon_coles=use_dixon_coles)
            r16_winners[m_id] = teams_map[winner_id]

        # 4.3 Cuartos de Final (Matches 97 a 100)
        qf_winners = {}
        for idx, (m_a, m_b) in enumerate(self.qf_pairings):
            m_id = 97 + idx
            team_a = r16_winners[m_a]
            team_b = r16_winners[m_b]
            _, _, winner_id = self.simulate_match_outcome(team_a, team_b, is_knockout=True, use_dixon_coles=use_dixon_coles)
            qf_winners[m_id] = teams_map[winner_id]

        # 4.4 Semifinales (Matches 101 y 102)
        sf_winners = {}
        sf_losers = {}
        for idx, (m_a, m_b) in enumerate(self.sf_pairings):
            m_id = 101 + idx
            team_a = qf_winners[m_a]
            team_b = qf_winners[m_b]
            _, _, winner_id = self.simulate_match_outcome(team_a, team_b, is_knockout=True, use_dixon_coles=use_dixon_coles)
            sf_winners[m_id] = teams_map[winner_id]
            sf_losers[m_id] = team_b if winner_id == team_a['id'] else team_a

        # 4.5 Tercer Lugar (Match 103)
        team_3a = sf_losers[101]
        team_3b = sf_losers[102]
        _, _, third_place_winner_id = self.simulate_match_outcome(team_3a, team_3b, is_knockout=True, use_dixon_coles=use_dixon_coles)

        # 4.6 Final (Match 104)
        team_f1 = sf_winners[101]
        team_f2 = sf_winners[102]
        _, _, champion_id = self.simulate_match_outcome(team_f1, team_f2, is_knockout=True, use_dixon_coles=use_dixon_coles)

        # 5. Mapear resultados finales para estadísticas agregadas
        # Retorna el nivel máximo alcanzado por cada selección en esta corrida
        results = {t['id']: 'group' for t in all_teams}
        
        # 16avos de final
        for t in r32_teams.values():
            results[t['id']] = 'r32'
        for t in best_thirds:
            results[t['id']] = 'r32'

        # Octavos de final
        for t in knockout_winners.values():
            results[t['id']] = 'r16'

        # Cuartos de final
        for t in r16_winners.values():
            results[t['id']] = 'qf'

        # Semifinal
        for t in qf_winners.values():
            results[t['id']] = 'sf'

        # Finalistas y Campeón
        results[team_f1['id']] = 'finalist'
        results[team_f2['id']] = 'finalist'
        results[champion_id] = 'champion'

        return results

    def run_monte_carlo_simulation(self, all_teams: list, all_matches: list, num_simulations: int = 10000, model_type: str = "dixon_coles") -> list:
        """
        Ejecuta la simulación de Monte Carlo en el torneo N veces.
        Retorna una lista de diccionarios lista para ser insertada por lotes (upsert) en `simulation_stats`.
        """
        # Estructura para contar las frecuencias de llegada
        counts = {t['id']: {
            'r32': 0, 'r16': 0, 'qf': 0, 'sf': 0, 'finalist': 0, 'champion': 0
        } for t in all_teams}

        use_dixon_coles = (model_type == "dixon_coles")

        for _ in range(num_simulations):
            res = self.simulate_single_tournament(all_teams, all_matches, use_dixon_coles=use_dixon_coles)
            for team_id, stage in res.items():
                if stage == 'r32':
                    counts[team_id]['r32'] += 1
                elif stage == 'r16':
                    counts[team_id]['r32'] += 1
                    counts[team_id]['r16'] += 1
                elif stage == 'qf':
                    counts[team_id]['r32'] += 1
                    counts[team_id]['r16'] += 1
                    counts[team_id]['qf'] += 1
                elif stage == 'sf':
                    counts[team_id]['r32'] += 1
                    counts[team_id]['r16'] += 1
                    counts[team_id]['qf'] += 1
                    counts[team_id]['sf'] += 1
                elif stage == 'finalist':
                    counts[team_id]['r32'] += 1
                    counts[team_id]['r16'] += 1
                    counts[team_id]['qf'] += 1
                    counts[team_id]['sf'] += 1
                    counts[team_id]['finalist'] += 1
                elif stage == 'champion':
                    counts[team_id]['r32'] += 1
                    counts[team_id]['r16'] += 1
                    counts[team_id]['qf'] += 1
                    counts[team_id]['sf'] += 1
                    counts[team_id]['finalist'] += 1
                    counts[team_id]['champion'] += 1

        # Convertir contadores a probabilidades relativas
        upsert_payload = []
        for team_id, count_dict in counts.items():
            upsert_payload.append({
                'team_id': team_id,
                'r32_prob': round(count_dict['r32'] / num_simulations, 4),
                'r16_prob': round(count_dict['r16'] / num_simulations, 4),
                'qf_prob': round(count_dict['qf'] / num_simulations, 4),
                'sf_prob': round(count_dict['sf'] / num_simulations, 4),
                'finalist_prob': round(count_dict['finalist'] / num_simulations, 4),
                'champion_prob': round(count_dict['champion'] / num_simulations, 4)
            })

        return upsert_payload
