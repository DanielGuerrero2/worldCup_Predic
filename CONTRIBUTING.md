# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir al **World Cup 2026 Predictor**! Esta guía describe el flujo de trabajo, convenciones y mejores prácticas para participar en el proyecto.

---

## 📋 Tabla de Contenidos

- [Código de Conducta](#-código-de-conducta)
- [Cómo contribuir](#-cómo-contribuir)
- [Configuración del entorno](#-configuración-del-entorno)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Convenciones de commits](#-convenciones-de-commits)
- [Flujo de trabajo con Git](#-flujo-de-trabajo-con-git)
- [Estilo de código](#-estilo-de-código)
- [Reportar bugs](#-reportar-bugs)
- [Proponer nuevas funcionalidades](#-proponer-nuevas-funcionalidades)

---

## 📜 Código de Conducta

Este proyecto se adhiere a un estándar de comportamiento respetuoso e inclusivo. Todos los colaboradores deben:

- Tratar a los demás con respeto y profesionalismo.
- Aceptar críticas constructivas con madurez.
- Centrarse en lo que es mejor para la comunidad y el proyecto.

---

## 🚀 Cómo contribuir

1. **Fork** del repositorio.
2. **Crea una rama** desde `main` con un nombre descriptivo.
3. **Realiza tus cambios** siguiendo las convenciones descritas abajo.
4. **Ejecuta las pruebas** y verifica que todo funcione correctamente.
5. **Abre un Pull Request** con una descripción clara de los cambios.

---

## ⚙️ Configuración del entorno

### Backend

```bash
# Instalar uv (si no lo tienes)
# https://docs.astral.sh/uv/

# Sincronizar dependencias
uv sync

# Copiar variables de entorno
cp .env.example .env

# Ejecutar el backend
uv run uvicorn main:app --port 8000 --reload
```

### Frontend

```bash
cd frontend

# Instalar dependencias
pnpm install

# Ejecutar en modo desarrollo
pnpm dev
```

---

## 🏗️ Estructura del proyecto

```
worldCup_Predic/
├── main.py              # API REST (FastAPI)
├── predictor.py         # Motor de predicción estadística
├── simulator.py         # Simulador Monte Carlo
├── database.py          # Capa de datos SQLite
├── data/seed_data.sql   # Schema + datos iniciales
├── frontend/            # Aplicación React + TypeScript
│   ├── src/components/  # Componentes de UI
│   ├── src/lib/         # Utilidades y cliente API
│   └── ...
└── pyproject.toml       # Dependencias Python
```

> **Regla clave**: La base de datos SQLite (`worldcup.db`) se genera automáticamente al iniciar el backend. **No la incluyas** en commits.

---

## 📝 Convenciones de commits

Usamos **[Conventional Commits](https://www.conventionalcommits.org/)** para mantener un historial limpio y generable en changelogs automáticos.

### Formato

```
<tipo>(alcance opcional): descripción corta en imperativo

[cuerpo opcional]

[pie de página opcional]
```

### Tipos permitidos

| Tipo       | Descripción                                                |
| ---------- | ---------------------------------------------------------- |
| `feat`     | Nueva funcionalidad o característica                       |
| `fix`      | Corrección de un bug                                       |
| `docs`     | Cambios exclusivamente en documentación                    |
| `style`    | Cambios de formato (espacios, punto y coma, etc.)          |
| `refactor` | Refactorización de código sin cambiar funcionalidad        |
| `perf`     | Mejora de rendimiento                                      |
| `test`     | Agregar o corregir tests                                   |
| `chore`    | Cambios en tooling, CI, o tareas de mantenimiento          |
| `build`    | Cambios en el sistema de build o dependencias              |
| `ci`       | Cambios en configuración de integración continua           |

### Ejemplos

```bash
# Bueno ✅
feat(simulator): add Poisson model as alternative to Dixon-Coles
fix(database): resolve upsert conflict on simulation_stats
docs: add project README with architecture overview
chore: update .gitignore to exclude SQLite database

# Malo ❌
"updated stuff"
"fix"
"WIP"
```

### Reglas importantes

- La descripción debe estar en **imperativo** ("add feature", no "added feature").
- La primera línea no debe exceder **72 caracteres**.
- Un commit debe ser **atómico**: un cambio lógico por commit.
- Si un commit cierra un issue: `fix(api): handle empty teams list (closes #12)`.

---

## 🌿 Flujo de trabajo con Git

### Ramas

| Rama            | Propósito                              |
| --------------- | -------------------------------------- |
| `main`          | Código estable y listo para producción |
| `feat/<nombre>` | Desarrollo de nuevas funcionalidades   |
| `fix/<nombre>`  | Corrección de bugs                     |
| `docs/<nombre>` | Cambios en documentación               |

### Ejemplo de flujo

```bash
# 1. Crear rama desde main
git checkout -b feat/penalty-shootout-model

# 2. Hacer commits atómicos
git add simulator.py
git commit -m "feat(simulator): add weighted penalty shootout model"

git add frontend/src/components/MatchCenter.tsx
git commit -m "feat(ui): display penalty probability in match center"

# 3. Push y abrir PR
git push origin feat/penalty-shootout-model
```

---

## 🎨 Estilo de código

### Python (Backend)

- **Versión**: Python 3.11+
- **Docstrings**: Todas las funciones públicas deben tener docstring en español.
- **Tipado**: Usar type hints en firmas de funciones (`def foo(x: int) -> str:`).
- **Formato**: Seguir PEP 8. Se recomienda usar `ruff` como formateador/linter.
- **Imports**: Agrupar en 3 bloques separados por línea vacía: stdlib → terceros → locales.

### TypeScript (Frontend)

- **Framework**: React 18 con componentes funcionales y hooks.
- **Estilos**: Tailwind CSS para clases de utilidad.
- **Tipos**: Evitar `any`. Definir interfaces y tipos para todos los datos.
- **Componentes**: Un componente por archivo, nombrado en PascalCase.

---

## 🐛 Reportar bugs

Abre un **Issue** con la siguiente información:

1. **Descripción** clara del problema.
2. **Pasos para reproducir** el bug.
3. **Comportamiento esperado** vs. **comportamiento actual**.
4. **Capturas de pantalla** si aplica.
5. **Entorno**: OS, versión de Python, versión de Node.js, navegador.

---

## 💡 Proponer nuevas funcionalidades

Abre un **Issue** con la etiqueta `enhancement` que incluya:

1. **Descripción** de la funcionalidad propuesta.
2. **Motivación**: ¿Por qué es útil? ¿Qué problema resuelve?
3. **Propuesta de implementación** (opcional pero apreciada).
4. **Alternativas consideradas**.

### Ideas de contribución

- 🧪 Agregar tests unitarios con `pytest` para `predictor.py` y `simulator.py`.
- 📈 Implementar modelo Elo predictivo como tercera opción de modelo.
- 🌐 Internacionalización (i18n) del frontend (español/inglés).
- 📱 Mejorar la experiencia responsive en dispositivos móviles.
- 🔄 Agregar WebSockets para progreso en tiempo real de simulaciones largas.

---

<div align="center">
  <strong>¡Toda contribución, por pequeña que sea, es valiosa! 🎉</strong>
</div>
