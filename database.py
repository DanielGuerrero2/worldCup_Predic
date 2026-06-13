import sqlite3
import os
from dotenv import load_dotenv

# Cargar variables del entorno
load_dotenv()

DATABASE_PATH = "worldcup.db"
SQL_SEED_PATH = os.path.join(os.path.dirname(__file__), "data", "seed_data.sql")

def get_db_connection():
    """Establece una conexión con la base de datos SQLite."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Habilita el acceso tipo diccionario: row['columna']
    return conn

def init_db():
    """Crea la base de datos local e inicializa sus tablas y datos si no existen."""
    if not os.path.exists(DATABASE_PATH) or os.path.getsize(DATABASE_PATH) == 0:
        print(f"Iniciando creación de la base de datos local SQLite: {DATABASE_PATH}")
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            with open(SQL_SEED_PATH, "r", encoding="utf-8") as f:
                sql_script = f.read()
                
            cursor.executescript(sql_script)
            conn.commit()
            conn.close()
            print("Base de datos SQLite creada e inicializada correctamente.")
        except Exception as e:
            print(f"Error al inicializar la base de datos SQLite: {e}")
            
    # Asegurar que existan tablas de actualización posterior
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS simulation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                num_simulations INTEGER,
                model_type TEXT,
                top_contenders TEXT
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error al asegurar tablas adicionales en SQLite: {e}")

# Inicializar la base de datos de manera inmediata al importar el módulo
init_db()

def get_teams():
    """Obtiene la lista de todas las selecciones de la base de datos SQLite."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM teams")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error al obtener equipos de SQLite: {e}")
        return []

def get_matches():
    """Obtiene todos los partidos ordenados por ID de la base de datos SQLite."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM matches ORDER BY id")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error al obtener partidos de SQLite: {e}")
        return []

def update_match_score(match_id: int, team_a_score: int | None, team_b_score: int | None, status: str = "completed"):
    """Actualiza el marcador y el estado de un partido específico en SQLite."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE matches
            SET team_a_score = ?, team_b_score = ?, status = ?
            WHERE id = ?
        """, (team_a_score, team_b_score, status, match_id))
        conn.commit()
        
        cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        print(f"Error al actualizar marcador del partido {match_id} en SQLite: {e}")
        return None

def update_simulation_stats(stats: list):
    """Guarda masivamente (upsert) las estadísticas de la simulación de Monte Carlo en SQLite."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        for s in stats:
            cursor.execute("""
                INSERT INTO simulation_stats (team_id, r32_prob, r16_prob, qf_prob, sf_prob, finalist_prob, champion_prob)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(team_id) DO UPDATE SET
                    r32_prob = excluded.r32_prob,
                    r16_prob = excluded.r16_prob,
                    qf_prob = excluded.qf_prob,
                    sf_prob = excluded.sf_prob,
                    finalist_prob = excluded.finalist_prob,
                    champion_prob = excluded.champion_prob,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                s['team_id'], s['r32_prob'], s['r16_prob'], s['qf_prob'],
                s['sf_prob'], s['finalist_prob'], s['champion_prob']
            ))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error al actualizar estadísticas de simulación en SQLite: {e}")
        return False

def get_simulation_stats():
    """Obtiene todas las estadísticas de simulación guardadas en SQLite."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM simulation_stats")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error al obtener estadísticas de simulación de SQLite: {e}")
        return []

def insert_simulation_run(num_simulations: int, model_type: str, top_contenders: str):
    """Inserta un registro de ejecución de simulación de Monte Carlo."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO simulation_history (num_simulations, model_type, top_contenders)
            VALUES (?, ?, ?)
        """, (num_simulations, model_type, top_contenders))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error al insertar historial de simulación: {e}")
        return False

def get_simulation_history():
    """Obtiene el historial de ejecuciones de simulación."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM simulation_history ORDER BY timestamp DESC LIMIT 20")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error al obtener historial de simulaciones: {e}")
        return []
