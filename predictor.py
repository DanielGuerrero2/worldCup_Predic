import math
import numpy as np

class MatchPredictor:
    def __init__(self):
        # Promedio base de goles anotados por partido en torneos de alto nivel
        self.avg_goals_home = 1.35
        self.avg_goals_away = 1.15
        
        # Parámetro rho para la corrección de Dixon-Coles (ajusta la probabilidad de empates de pocos goles)
        # Un valor negativo ajusta a que haya menos empates hiper-probables de forma artificial.
        self.rho = -0.08

    def predict_match(self, attack_a: float, defense_a: float, attack_b: float, defense_b: float, is_home_a: bool = False, is_home_b: bool = False, max_goals: int = 10, use_dixon_coles: bool = True):
        """
        Calcula las probabilidades de cada marcador exacto usando Poisson (con o sin el ajuste Dixon-Coles).
        Retorna la matriz de probabilidades (filas = goles A, columnas = goles B) y los lambdas.
        """
        # Multiplicadores de localía
        home_mult_a = 1.12 if is_home_a else 1.0
        home_mult_b = 1.12 if is_home_b else 1.0

        # Calcular goles esperados (lambdas)
        lambda_a = max(0.1, attack_a * defense_b * self.avg_goals_home * home_mult_a)
        lambda_b = max(0.1, attack_b * defense_a * self.avg_goals_away * home_mult_b)

        # Precalcular Poisson lists para velocidad (reemplaza scipy.stats por math.exp y factoriales simples)
        poisson_a = []
        poisson_b = []
        exp_a = math.exp(-lambda_a)
        exp_b = math.exp(-lambda_b)
        
        factorials = [1] * (max_goals + 1)
        for i in range(1, max_goals + 1):
            factorials[i] = factorials[i-1] * i
            
        for k in range(max_goals + 1):
            poisson_a.append((lambda_a ** k) * exp_a / factorials[k])
            poisson_b.append((lambda_b ** k) * exp_b / factorials[k])

        # Construir matriz de distribución Poisson conjunta usando producto externo (vectorizado)
        grid = np.outer(poisson_a, poisson_b)

        # Aplicar el ajuste de Dixon-Coles para marcadores bajos (0-0, 1-0, 0-1, 1-1)
        if use_dixon_coles and lambda_a > 0 and lambda_b > 0:
            grid[0, 0] *= max(0.0, 1.0 - self.rho * lambda_a * lambda_b)
            grid[1, 0] *= max(0.0, 1.0 + self.rho * lambda_b)
            grid[0, 1] *= max(0.0, 1.0 + self.rho * lambda_a)
            grid[1, 1] *= max(0.0, 1.0 - self.rho)

        # Normalizar para asegurar que la suma sea exactamente 1.0
        total_sum = np.sum(grid)
        if total_sum > 0:
            grid = grid / total_sum

        return grid, lambda_a, lambda_b

    def get_outcome_probabilities(self, grid):
        """
        Dada la matriz de marcadores, calcula P(Victoria A), P(Empate), P(Victoria B).
        """
        # Cálculos vectorizados de NumPy para evitar bucles anidados
        win_a_prob = float(np.sum(np.tril(grid, -1)))
        draw_prob = float(np.sum(np.diag(grid)))
        win_b_prob = float(np.sum(np.triu(grid, 1)))

        return win_a_prob, draw_prob, win_b_prob

