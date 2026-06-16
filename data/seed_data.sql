-- 1. Crear Tabla de Selecciones Nacionales
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    group_letter TEXT NOT NULL,
    fifa_ranking INTEGER NOT NULL,
    elo_rating INTEGER NOT NULL,
    attack_strength REAL NOT NULL,
    defense_strength REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear Tabla de Partidos
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_a_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    team_b_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    stage TEXT NOT NULL,
    group_letter TEXT,
    team_a_score INTEGER,
    team_b_score INTEGER,
    status TEXT DEFAULT 'scheduled',
    match_date TEXT,
    stadium TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Crear Tabla de Estadísticas de Simulación
CREATE TABLE IF NOT EXISTS simulation_stats (
    team_id TEXT PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
    r32_prob REAL DEFAULT 0.0,
    r16_prob REAL DEFAULT 0.0,
    qf_prob REAL DEFAULT 0.0,
    sf_prob REAL DEFAULT 0.0,
    finalist_prob REAL DEFAULT 0.0,
    champion_prob REAL DEFAULT 0.0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Poblar Selecciones Nacionales (48 equipos y ratings iniciales)
INSERT OR IGNORE INTO teams (id, name, group_letter, fifa_ranking, elo_rating, attack_strength, defense_strength) VALUES
('MEX', 'México', 'A', 15, 1780, 1.200, 0.900),
('RSA', 'Sudáfrica', 'A', 59, 1550, 0.800, 1.300),
('KOR', 'República de Corea', 'A', 22, 1770, 1.100, 1.000),
('CZE', 'Chequia', 'A', 36, 1720, 1.000, 1.100),
('CAN', 'Canadá', 'B', 40, 1750, 1.100, 1.000),
('BIH', 'Bosnia y Herzegovina', 'B', 74, 1560, 0.800, 1.200),
('QAT', 'Qatar', 'B', 38, 1600, 0.900, 1.200),
('SUI', 'Suiza', 'B', 19, 1820, 1.200, 0.800),
('BRA', 'Brasil', 'C', 5, 1980, 1.600, 0.700),
('MAR', 'Marruecos', 'C', 13, 1810, 1.300, 0.800),
('HAI', 'Haití', 'C', 86, 1450, 0.700, 1.400),
('SCO', 'Escocia', 'C', 51, 1680, 1.000, 1.100),
('USA', 'Estados Unidos', 'D', 11, 1800, 1.300, 0.900),
('PAR', 'Paraguay', 'D', 56, 1680, 0.900, 1.000),
('AUS', 'Australia', 'D', 24, 1720, 1.000, 1.000),
('TUR', 'Turquía', 'D', 26, 1740, 1.100, 1.000),
('GER', 'Alemania', 'E', 16, 1920, 1.500, 0.800),
('CUW', 'Curazao', 'E', 90, 1400, 0.600, 1.500),
('CIV', 'Costa de Marfil', 'E', 39, 1750, 1.200, 0.900),
('ECU', 'Ecuador', 'E', 30, 1800, 1.200, 0.800),
('NED', 'Países Bajos', 'F', 7, 1960, 1.500, 0.700),
('JPN', 'Japón', 'F', 18, 1840, 1.300, 0.800),
('SWE', 'Suecia', 'F', 28, 1760, 1.100, 0.900),
('TUN', 'Túnez', 'F', 41, 1620, 0.800, 1.100),
('BEL', 'Bélgica', 'G', 6, 1950, 1.400, 0.800),
('EGY', 'Egipto', 'G', 32, 1700, 1.100, 1.000),
('IRN', 'Irán', 'G', 20, 1730, 1.000, 1.000),
('NZL', 'Nueva Zelanda', 'G', 104, 1420, 0.700, 1.400),
('ESP', 'España', 'H', 8, 2040, 1.750, 0.600),
('CPV', 'Cabo Verde', 'H', 65, 1580, 0.800, 1.200),
('KSA', 'Arabia Saudita', 'H', 53, 1620, 0.900, 1.100),
('URU', 'Uruguay', 'H', 14, 1930, 1.400, 0.700),
('FRA', 'Francia', 'I', 2, 2060, 1.800, 0.600),
('SEN', 'Senegal', 'I', 17, 1740, 1.100, 0.900),
('IRQ', 'Irak', 'I', 58, 1590, 0.800, 1.200),
('NOR', 'Noruega', 'I', 47, 1780, 1.300, 0.900),
('ARG', 'Argentina', 'J', 1, 2130, 1.750, 0.600),
('ALG', 'Argelia', 'J', 43, 1670, 1.000, 1.000),
('AUT', 'Austria', 'J', 25, 1800, 1.200, 0.800),
('JOR', 'Jordania', 'J', 71, 1520, 0.800, 1.300),
('POR', 'Portugal', 'K', 9, 2000, 1.600, 0.700),
('COD', 'República Democrática del Congo', 'K', 61, 1570, 0.800, 1.200),
('UZB', 'Uzbekistán', 'K', 66, 1610, 0.900, 1.100),
('COL', 'Colombia', 'K', 12, 1960, 1.500, 0.700),
('ENG', 'Inglaterra', 'L', 4, 2010, 1.700, 0.650),
('CRO', 'Croacia', 'L', 10, 1880, 1.300, 0.800),
('GHA', 'Ghana', 'L', 60, 1580, 0.900, 1.200),
('PAN', 'Panamá', 'L', 45, 1640, 0.900, 1.100);

-- 5. Poblar Partidos de Fase de Grupos (72 partidos, incluyendo marcadores de Jornada 1)
INSERT OR IGNORE INTO matches (id, team_a_id, team_b_id, stage, group_letter, team_a_score, team_b_score, status) VALUES
-- Grupo A
(1, 'MEX', 'RSA', 'group', 'A', 2, 0, 'completed'),
(2, 'KOR', 'CZE', 'group', 'A', 2, 1, 'completed'),
(3, 'MEX', 'KOR', 'group', 'A', NULL, NULL, 'scheduled'),
(4, 'RSA', 'CZE', 'group', 'A', NULL, NULL, 'scheduled'),
(5, 'CZE', 'MEX', 'group', 'A', NULL, NULL, 'scheduled'),
(6, 'KOR', 'RSA', 'group', 'A', NULL, NULL, 'scheduled'),

-- Grupo B
(7, 'CAN', 'BIH', 'group', 'B', 1, 1, 'completed'),
(8, 'QAT', 'SUI', 'group', 'B', 1, 1, 'completed'),
(9, 'CAN', 'QAT', 'group', 'B', NULL, NULL, 'scheduled'),
(10, 'BIH', 'SUI', 'group', 'B', NULL, NULL, 'scheduled'),
(11, 'SUI', 'CAN', 'group', 'B', NULL, NULL, 'scheduled'),
(12, 'QAT', 'BIH', 'group', 'B', NULL, NULL, 'scheduled'),

-- Grupo C
(13, 'BRA', 'MAR', 'group', 'C', 1, 1, 'completed'),
(14, 'HAI', 'SCO', 'group', 'C', 0, 1, 'completed'),
(15, 'BRA', 'HAI', 'group', 'C', NULL, NULL, 'scheduled'),
(16, 'MAR', 'SCO', 'group', 'C', NULL, NULL, 'scheduled'),
(17, 'SCO', 'BRA', 'group', 'C', NULL, NULL, 'scheduled'),
(18, 'MAR', 'HAI', 'group', 'C', NULL, NULL, 'scheduled'),

-- Grupo D
(19, 'USA', 'PAR', 'group', 'D', 4, 1, 'completed'),
(20, 'AUS', 'TUR', 'group', 'D', 2, 0, 'completed'),
(21, 'USA', 'AUS', 'group', 'D', NULL, NULL, 'scheduled'),
(22, 'PAR', 'TUR', 'group', 'D', NULL, NULL, 'scheduled'),
(23, 'TUR', 'USA', 'group', 'D', NULL, NULL, 'scheduled'),
(24, 'AUS', 'PAR', 'group', 'D', NULL, NULL, 'scheduled'),

-- Grupo E
(25, 'GER', 'CUW', 'group', 'E', 7, 1, 'completed'),
(26, 'CIV', 'ECU', 'group', 'E', 1, 0, 'completed'),
(27, 'GER', 'CIV', 'group', 'E', NULL, NULL, 'scheduled'),
(28, 'CUW', 'ECU', 'group', 'E', NULL, NULL, 'scheduled'),
(29, 'ECU', 'GER', 'group', 'E', NULL, NULL, 'scheduled'),
(30, 'CIV', 'CUW', 'group', 'E', NULL, NULL, 'scheduled'),

-- Grupo F
(31, 'NED', 'JPN', 'group', 'F', 2, 2, 'completed'),
(32, 'SWE', 'TUN', 'group', 'F', 5, 1, 'completed'),
(33, 'NED', 'SWE', 'group', 'F', NULL, NULL, 'scheduled'),
(34, 'JPN', 'TUN', 'group', 'F', NULL, NULL, 'scheduled'),
(35, 'TUN', 'NED', 'group', 'F', NULL, NULL, 'scheduled'),
(36, 'SWE', 'JPN', 'group', 'F', NULL, NULL, 'scheduled'),

-- Grupo G
(37, 'BEL', 'EGY', 'group', 'G', 1, 1, 'completed'),
(38, 'IRN', 'NZL', 'group', 'G', 2, 2, 'completed'),
(39, 'BEL', 'IRN', 'group', 'G', NULL, NULL, 'scheduled'),
(40, 'EGY', 'NZL', 'group', 'G', NULL, NULL, 'scheduled'),
(41, 'NZL', 'BEL', 'group', 'G', NULL, NULL, 'scheduled'),
(42, 'IRN', 'EGY', 'group', 'G', NULL, NULL, 'scheduled'),

-- Grupo H
(43, 'ESP', 'CPV', 'group', 'H', 0, 0, 'completed'),
(44, 'KSA', 'URU', 'group', 'H', 1, 1, 'completed'),
(45, 'ESP', 'KSA', 'group', 'H', NULL, NULL, 'scheduled'),
(46, 'CPV', 'URU', 'group', 'H', NULL, NULL, 'scheduled'),
(47, 'URU', 'ESP', 'group', 'H', NULL, NULL, 'scheduled'),
(48, 'KSA', 'CPV', 'group', 'H', NULL, NULL, 'scheduled'),

-- Grupo I
(49, 'FRA', 'SEN', 'group', 'I', NULL, NULL, 'scheduled'),
(50, 'IRQ', 'NOR', 'group', 'I', NULL, NULL, 'scheduled'),
(51, 'FRA', 'IRQ', 'group', 'I', NULL, NULL, 'scheduled'),
(52, 'SEN', 'NOR', 'group', 'I', NULL, NULL, 'scheduled'),
(53, 'NOR', 'FRA', 'group', 'I', NULL, NULL, 'scheduled'),
(54, 'SEN', 'IRQ', 'group', 'I', NULL, NULL, 'scheduled'),

-- Grupo J
(55, 'ARG', 'ALG', 'group', 'J', NULL, NULL, 'scheduled'),
(56, 'AUT', 'JOR', 'group', 'J', NULL, NULL, 'scheduled'),
(57, 'ARG', 'AUT', 'group', 'J', NULL, NULL, 'scheduled'),
(58, 'ALG', 'JOR', 'group', 'J', NULL, NULL, 'scheduled'),
(59, 'JOR', 'ARG', 'group', 'J', NULL, NULL, 'scheduled'),
(60, 'AUT', 'ALG', 'group', 'J', NULL, NULL, 'scheduled'),

-- Grupo K
(61, 'POR', 'COD', 'group', 'K', NULL, NULL, 'scheduled'),
(62, 'UZB', 'COL', 'group', 'K', NULL, NULL, 'scheduled'),
(63, 'POR', 'UZB', 'group', 'K', NULL, NULL, 'scheduled'),
(64, 'COD', 'COL', 'group', 'K', NULL, NULL, 'scheduled'),
(65, 'COL', 'POR', 'group', 'K', NULL, NULL, 'scheduled'),
(66, 'UZB', 'COD', 'group', 'K', NULL, NULL, 'scheduled'),

-- Grupo L
(67, 'ENG', 'CRO', 'group', 'L', NULL, NULL, 'scheduled'),
(68, 'GHA', 'PAN', 'group', 'L', NULL, NULL, 'scheduled'),
(69, 'ENG', 'GHA', 'group', 'L', NULL, NULL, 'scheduled'),
(70, 'CRO', 'PAN', 'group', 'L', NULL, NULL, 'scheduled'),
(71, 'PAN', 'ENG', 'group', 'L', NULL, NULL, 'scheduled'),
(72, 'CRO', 'GHA', 'group', 'L', NULL, NULL, 'scheduled'),

-- Cruces Eliminatorios (Matches 73 a 104) vacíos por defecto
(73, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(74, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(75, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(76, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(77, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(78, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(79, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(80, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(81, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(82, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(83, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(84, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(85, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(86, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(87, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(88, NULL, NULL, 'r32', NULL, NULL, NULL, 'scheduled'),
(89, NULL, NULL, 'r16', NULL, NULL, NULL, 'scheduled'),
(90, NULL, NULL, 'r16', NULL, NULL, NULL, 'scheduled'),
(91, NULL, NULL, 'r16', NULL, NULL, NULL, 'scheduled'),
(92, NULL, NULL, 'r16', NULL, NULL, NULL, 'scheduled'),
(93, NULL, NULL, 'r16', NULL, NULL, NULL, 'scheduled'),
(94, NULL, NULL, 'r16', NULL, NULL, NULL, 'scheduled'),
(95, NULL, NULL, 'r16', NULL, NULL, NULL, 'scheduled'),
(96, NULL, NULL, 'r16', NULL, NULL, NULL, 'scheduled'),
(97, NULL, NULL, 'qf', NULL, NULL, NULL, 'scheduled'),
(98, NULL, NULL, 'qf', NULL, NULL, NULL, 'scheduled'),
(99, NULL, NULL, 'qf', NULL, NULL, NULL, 'scheduled'),
(100, NULL, NULL, 'qf', NULL, NULL, NULL, 'scheduled'),
(101, NULL, NULL, 'sf', NULL, NULL, NULL, 'scheduled'),
(102, NULL, NULL, 'sf', NULL, NULL, NULL, 'scheduled'),
(103, NULL, NULL, 'third_place', NULL, NULL, NULL, 'scheduled'),
(104, NULL, NULL, 'final', NULL, NULL, NULL, 'scheduled');

-- 6. Inicializar tabla de estadísticas de simulación con valores en cero
INSERT OR IGNORE INTO simulation_stats (team_id)
SELECT id FROM teams;
