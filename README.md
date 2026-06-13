# ⚽ World Cup 2026 Predictor & Simulator

<div align="center">

**Predictor y Simulador del Mundial FIFA 2026** — Aplicación full-stack que modela matemáticamente el torneo completo de 48 equipos usando distribución de Poisson, corrección de Dixon-Coles y simulaciones de Monte Carlo.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.136+-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## 📖 Descripción

Este proyecto simula el **Mundial FIFA 2026** (formato de 48 equipos, 12 grupos de 4) utilizando modelos estadísticos avanzados para predecir resultados de partidos individuales y probabilidades de avance en el torneo completo.

### Características principales

- 🎯 **Predicción Head-to-Head (H2H)** — Compara dos selecciones con modelos Dixon-Coles o Poisson puro, mostrando probabilidades exactas de victoria, empate y derrota, junto con una matriz de marcadores.
- 🎲 **Simulación Monte Carlo** — Ejecuta hasta 25,000 iteraciones del torneo completo para calcular la probabilidad de que cada selección alcance cada ronda (Ronda de 32, Octavos, Cuartos, Semis, Final, Campeón).
- 📊 **Dashboard interactivo** — Visualización en tiempo real del ranking de probabilidades de campeón, distribución de avance por ronda e historial de simulaciones pasadas.
- 📋 **Historial de predicciones** — Almacenamiento persistente de predicciones H2H y ejecuciones Monte Carlo para consulta posterior.
- ✏️ **Edición de marcadores** — Actualización manual de resultados reales para recalibrar las simulaciones en tiempo real.
- 🏟️ **Bracket interactivo** — Visualización del cuadro eliminatorio completo con los cruces del Anexo C de la FIFA.

---

## 🏗️ Arquitectura

```
worldCup_Predic/
├── main.py              # API REST (FastAPI) — endpoints de equipos, partidos, predicciones y simulaciones
├── predictor.py         # Motor de predicción (Poisson + Dixon-Coles)
├── simulator.py         # Simulador de torneo completo + Monte Carlo
├── database.py          # Capa de acceso a datos (SQLite)
├── data/
│   └── seed_data.sql    # Schema DDL + datos iniciales (48 selecciones, 72 partidos de grupo)
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Componente raíz con gestión de estado global
│   │   ├── components/
│   │   │   ├── Dashboard.tsx    # Panel principal con rankings y estadísticas
│   │   │   ├── GroupStages.tsx  # Fase de grupos con tablas de posiciones
│   │   │   ├── MatchCenter.tsx  # Predicciones H2H entre dos selecciones
│   │   │   ├── MyPredictions.tsx # Historial de predicciones guardadas
│   │   │   └── Bracket.tsx      # Cuadro eliminatorio visual
│   │   ├── lib/
│   │   │   └── api.ts           # Cliente HTTP para la API REST
│   │   └── index.css            # Sistema de diseño y estilos globales
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── pyproject.toml       # Dependencias Python (gestionadas con uv)
├── .env.example         # Plantilla de variables de entorno
└── .gitignore
```

---

## 🧮 Modelos Estadísticos

### Poisson bivariado

El modelo base calcula los **goles esperados** (λ) de cada equipo:

```
λ_A = Ataque_A × Defensa_B × Promedio_goles × Factor_localía
λ_B = Ataque_B × Defensa_A × Promedio_goles × Factor_localía
```

La probabilidad de cada marcador exacto `(i, j)` se calcula como:

```
P(X=i, Y=j) = Poisson(i; λ_A) × Poisson(j; λ_B)
```

### Corrección Dixon-Coles

Para marcadores bajos (0-0, 1-0, 0-1, 1-1), se aplica un **factor de corrección ρ** que ajusta la inflación/deflación del modelo bivariado independiente:

| Marcador | Factor de ajuste            |
| -------- | --------------------------- |
| 0-0      | `1 - ρ × λ_A × λ_B`       |
| 1-0      | `1 + ρ × λ_B`              |
| 0-1      | `1 + ρ × λ_A`              |
| 1-1      | `1 - ρ`                    |

> **ρ = -0.08** (calibrado para ajustar la sobreestimación de empates a cero en torneos internacionales).

### Simulación Monte Carlo

Cada iteración simula el torneo completo:

1. **Fase de grupos** — Se simulan los 72 partidos de grupo.
2. **Clasificación** — Los dos mejores de cada grupo + los 8 mejores terceros avanzan (reglas del Anexo C de la FIFA).
3. **Fase eliminatoria** — Ronda de 32 → Octavos → Cuartos → Semifinales → Final.
4. **Desempate en eliminatorias** — Tiempo extra (λ/3) + tandas de penales (ponderadas por diferencia Elo).

Las probabilidades finales se calculan como frecuencias relativas sobre N simulaciones.

### Métricas de decisión

El ganador de cada partido se decide por:

- **Goles muestreados** de la distribución Poisson bivariada (búsqueda binaria acumulativa sobre la grilla normalizada).
- **Factor de localía**: ×1.12 para USA, México y Canadá como anfitriones.
- **Elo**: Solo influye en tanda de penales (`P = 0.5 + 0.05 × (Elo_diff / 400)`).

---

## 🚀 Instalación y ejecución

### Prerequisitos

- **Python** ≥ 3.11
- **uv** (gestor de paquetes Python) — [Instalar uv](https://docs.astral.sh/uv/)
- **Node.js** ≥ 18 + **pnpm** — [Instalar pnpm](https://pnpm.io/installation)

### 1. Clonar el repositorio

```bash
git clone https://github.com/<tu-usuario>/worldCup_Predic.git
cd worldCup_Predic
```

### 2. Backend (FastAPI)

```bash
# Crear entorno virtual e instalar dependencias
uv sync

# Copiar variables de entorno
cp .env.example .env

# Ejecutar el servidor (la base de datos SQLite se crea automáticamente)
uv run uvicorn main:app --port 8000 --reload
```

El servidor arranca en `http://127.0.0.1:8000`. Documentación interactiva disponible en `/docs` (Swagger UI).

### 3. Frontend (React + Vite)

```bash
cd frontend

# Instalar dependencias
pnpm install

# Ejecutar en modo desarrollo
pnpm dev
```

El frontend arranca en `http://localhost:5173` y se conecta automáticamente al backend.

---

## 📡 API Endpoints

| Método | Ruta                        | Descripción                                      |
| ------ | --------------------------- | ------------------------------------------------ |
| GET    | `/api/teams`                | Lista de las 48 selecciones con sus ratings       |
| GET    | `/api/matches`              | Todos los partidos con marcadores y estado        |
| GET    | `/api/simulation-stats`     | Probabilidades actuales de avance por selección   |
| GET    | `/api/simulation-history`   | Historial de ejecuciones Monte Carlo              |
| POST   | `/api/predict-match`        | Predicción H2H entre dos selecciones              |
| POST   | `/api/matches/update`       | Actualizar marcador de un partido                 |
| POST   | `/api/simulate-tournament`  | Ejecutar simulación Monte Carlo del torneo        |

---

## 🛠️ Stack tecnológico

| Capa       | Tecnología                                        |
| ---------- | ------------------------------------------------- |
| Backend    | Python 3.11+, FastAPI, Uvicorn                    |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS          |
| BD         | SQLite (local, auto-generada desde `seed_data.sql`)|
| Matemáticas| NumPy, SciPy (Poisson), Algoritmo Dixon-Coles    |
| Tooling    | uv (Python), pnpm (Node.js)                      |

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Consulta [LICENSE](LICENSE) para más detalles.

---

<div align="center">
  <strong>Hecho con ❤️ para el Mundial FIFA 2026 🏆</strong>
</div>
