# Flashlearn

A flashcard web app built around the **SM-2 spaced-repetition algorithm**. FastAPI + SQLAlchemy on the
backend, a dependency-free JavaScript SPA on the front, JWT authentication, and a bilingual
(ES/EN) interface that defaults to a dark theme.

> Users create decks, add question/answer cards, and review them on a schedule computed by SM-2:
> the app decides when each card is due, the user only has to grade their recall from 0 to 5.

[![Tests](https://github.com/dbloodmoon/flashlearn/actions/workflows/tests.yml/badge.svg)](https://github.com/dbloodmoon/flashlearn/actions/workflows/tests.yml)
![Python](https://img.shields.io/badge/python-3.11%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [The SM-2 scheduler](#the-sm-2-scheduler)
- [API reference](#api-reference)
- [Getting started](#getting-started)
- [Running the tests](#running-the-tests)
- [Frontend notes](#frontend-notes)
- [Design decisions](#design-decisions)
- [Roadmap](#roadmap)
- [Author](#author)

---

## Features

**Backend**

- REST API with 16 endpoints, documented automatically by OpenAPI at `/docs`.
- JWT bearer authentication (HS256) with bcrypt password hashing and configurable token lifetime.
- Per-user data isolation: every query is scoped to the authenticated user, so one account can never
  read or mutate another account's decks.
- SM-2 spaced repetition implemented server-side, so scheduling is authoritative and cannot be
  bypassed by the client.
- SQLAlchemy 2.x ORM that runs unchanged on SQLite (local/dev) and PostgreSQL (production).
- Validation and serialization with Pydantic v2 schemas.
- 51 pytest tests covering auth, decks, cards, and the scheduler, wired into GitHub Actions.

**Frontend**

- Single-page app in plain HTML, CSS and JavaScript — no build step, no bundler, no framework.
- 3D flip-card review session with a 0–5 grading pad.
- Dark theme by default with a persisted light/dark toggle (applied before first paint, so there is
  no flash of the wrong theme).
- Full ES/EN interface (83 translation keys per language) with a segmented language switch.
- WCAG 2.1 AA contrast verified in both themes, keyboard focus styles, `aria-pressed` /
  `aria-label` on the theme toggle, and a `prefers-reduced-motion` fallback that disables animation.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| API | FastAPI 0.141 | Typed, async-ready, automatic OpenAPI docs |
| Data validation | Pydantic v2 | Request/response schemas with field constraints |
| ORM | SQLAlchemy 2.1 | Typed `DeclarativeBase` models, portable across SQLite/PostgreSQL |
| Auth | PyJWT + bcrypt | Stateless JWTs, adaptive password hashing |
| Database | PostgreSQL (prod) / SQLite (dev) | Same models, no vendor lock-in |
| Server | Uvicorn | ASGI server used by FastAPI |
| Frontend | Vanilla HTML/CSS/JS | Zero dependencies, instant load, easy to audit |
| Tests | pytest + FastAPI `TestClient` | In-memory SQLite with dependency overrides |
| CI | GitHub Actions | Test suite on every push to `main`/`master` |

---

## Architecture

```
.
├── main.py                 # FastAPI app: all 16 endpoints + SM-2 scheduler
├── auth.py                 # JWT creation/validation, bcrypt hashing, DB session dependency
├── models.py               # SQLAlchemy models: Usuario, Mazo, Tarjeta
├── schemas.py              # Pydantic request/response schemas
├── database.py             # Engine, session factory, DeclarativeBase
├── config.py               # Settings loaded from environment / .env
├── requirements.txt
├── static/                 # Frontend SPA, served by the same process
│   ├── index.html          # App shell + pre-paint theme script
│   ├── styles.css          # Design tokens, light & dark themes
│   ├── app.js              # Router, views, API client
│   └── i18n.js             # ES/EN dictionaries + theme storage helpers
├── tests/                  # pytest suite (51 tests)
└── .github/workflows/      # CI: pytest on every push
```

The backend serves the frontend from the same origin: `GET /` returns `index.html` and `/static` is
mounted as static files, so the app runs as a single process with no CORS configuration and no
separate frontend host.

### Data model

```
Usuario 1 ──── * Mazo 1 ──── * Tarjeta
```

| Table | Columns |
| --- | --- |
| `usuarios` | `id`, `username` (unique), `hashed_password`, `rol` |
| `mazos` | `id`, `nombre`, `descripcion`, `usuario_id` → `usuarios.id` |
| `tarjetas` | `id`, `pregunta`, `respuesta`, `mazo_id` → `mazos.id`, `proxima_revision`, `intervalo_dias`, `facilidad`, `veces_revisada` |

- `UNIQUE (nombre, usuario_id)` — deck names are unique per user, not globally.
- Cascading deletes are handled by the ORM (`cascade="all, delete-orphan"`): removing a deck also
  removes its cards, and removing a user removes their decks.
- New cards default to `proxima_revision = now() + 1 day`, `intervalo_dias = 1`,
  `facilidad = 2.5`, `veces_revisada = 0`.

---

## The SM-2 scheduler

Implemented in `aplicar_sm2()` (`main.py`), the classic SM-2 formulation with the standard
ease-factor floor of **1.3**.

**Ease factor** — updated on every grade, where `q` is the 0–5 self-rating:

```
EF' = max(1.3, EF + 0.1 − (5 − q) × (0.08 + (5 − q) × 0.02))
```

**Interval** — only grades `q ≥ 3` count as a successful recall:

| Situation | New interval |
| --- | --- |
| First successful review | 1 day |
| Second successful review | 6 days |
| Third and later | `round(interval × EF)` |
| Failed review (`q < 3`) | reset to 1 day, `veces_revisada` back to 0 |

Finally `proxima_revision = now() + intervalo_dias`, and `GET /tarjetas/repasar` returns every card
whose `proxima_revision <= now()`, ordered by due date.

---

## API reference

Base URL `http://127.0.0.1:8000`. All routes except `POST /usuarios/registrar`,
`POST /usuarios/login` and `GET /` require an `Authorization: Bearer <token>` header.

### Authentication

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/usuarios/registrar` | Create an account (`username` 3–25 chars, `password` 6–120) |
| `POST` | `/usuarios/login` | OAuth2 password form → `{ access_token, token_type }` |
| `GET` | `/usuarios/yo` | Current user with nested decks |
| `DELETE` | `/usuarios/yo` | Delete the current user and all their data |

### Decks

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/mazos` | List the current user's decks |
| `POST` | `/mazos` | Create a deck (name must be unique per user) |
| `GET` | `/mazo/{id}` | Fetch one deck |
| `PUT` | `/mazo/{id}` | Rename / edit a deck |
| `DELETE` | `/mazo/{id}` | Delete a deck and its cards |

### Cards

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/mazos/tarjetas` | Add a card to a deck (`pregunta`, `respuesta`, `mazo_id`) |
| `GET` | `/mazo/{id}/tarjetas` | List the cards of a deck |
| `PUT` | `/tarjeta/{id}` | Partial update of `pregunta` / `respuesta` |
| `DELETE` | `/tarjeta/{id}` | Delete a card |

### Review

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/tarjetas/repasar` | Cards due now, ordered by `proxima_revision` |
| `POST` | `/tarjeta/{id}/repasar` | Grade a card (`calificacion` 0–5) and reschedule it with SM-2 |

### Misc

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Serves the SPA (`static/index.html`) |
| `GET` | `/docs` · `/redoc` · `/openapi.json` | Interactive OpenAPI documentation |

Interactive documentation with try-it-out is available at
[`/docs`](http://127.0.0.1:8000/docs) once the server is running.

---

## Getting started

### Prerequisites

- Python 3.11 or newer
- PostgreSQL (optional — SQLite works out of the box for local development)

### 1. Clone and install

```bash
git clone https://github.com/dbloodmoon/flashlearn.git
cd flashlearn
python -m venv .venv
```

Activate it:

```bash
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate
```

```bash
pip install -r requirements.txt
```

### 2. Configure the environment

Settings are read from a `.env` file in the project root (see `config.py`). It is git-ignored, so
your secrets never reach the repository.

```ini
SECRET_KEY=change-me-to-a-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=sqlite:///./flashlearn.db
```

For PostgreSQL (Supabase, Neon, RDS, …):

```ini
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/flashlearn
```

Tables are created automatically on startup (`Base.metadata.create_all`), so there is no migration
step to run for a fresh database.

### 3. Run the app

```bash
python -m uvicorn main:app --port 8000
```

Then open:

- App → <http://127.0.0.1:8000>
- API docs → <http://127.0.0.1:8000/docs>

### 4. Try the API

```bash
# Register
curl -X POST http://127.0.0.1:8000/usuarios/registrar \
  -H "Content-Type: application/json" \
  -d '{"username":"daniel","password":"secreto123"}'

# Log in (OAuth2 password form, not JSON)
curl -X POST http://127.0.0.1:8000/usuarios/login \
  -d "username=daniel&password=secreto123"

# Create a deck and a card, then review
TOKEN="<access_token from the previous step>"
curl -X POST http://127.0.0.1:8000/mazos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nombre":"Ingles","descripcion":"vocabulary"}'
```

> **Note:** `POST /usuarios/login` expects an **OAuth2 password form** (`application/x-www-form-urlencoded`),
> not a JSON body. The Swagger UI has an **Authorize** button that handles this for you.

---

## Running the tests

```bash
python -m pytest -sv
```

The suite uses an **in-memory SQLite** database with a dependency override, so it needs no
configuration and never touches your development or production data.

```
51 passed
```

The same suite runs automatically on GitHub Actions for every push to `main`/`master`. The workflow
injects its own throwaway `SECRET_KEY` and a temporary SQLite `DATABASE_URL`.

---

## Frontend notes

**No build step.** `static/` is served as-is. There is no `package.json`, no bundler and no
framework runtime — the app is ~1,650 lines of hand-written HTML, CSS and JavaScript, which keeps the
whole stack auditable and the first paint instant.

**Theming.** All colors are CSS custom properties defined in `styles.css`; `:root` holds the light
palette and `:root[data-theme="dark"]` overrides it. A three-line inline script in `<head>` sets
`data-theme` from `localStorage` *before* the stylesheet is applied, so the page never flashes the
wrong theme. The choice is persisted in `localStorage['flashlearn_theme']`; with no stored preference
the app opens in dark mode. The flip card's back face inverts its surface in dark mode, because a
dark card on a dark background would kill the 3D flip.

**i18n.** `static/i18n.js` holds two dictionaries with identical key sets (83 keys each) and exposes
`t(key, params)` plus a `tp()` pluralization helper. Switching language dispatches a `langchange`
event that re-renders the view and every static string, including the theme toggle's accessible name.

**Accessibility.** Contrast was audited in both themes (all text ≥ 4.5:1, the primary button is the
tightest at 4.51:1 in light mode), the review card is operable by keyboard, the theme toggle exposes
`aria-pressed` and a translated `aria-label`, and `prefers-reduced-motion: reduce` disables the flip
transition and all animations.

---

## Design decisions

- **Scheduling lives on the server.** SM-2 runs in the API, not in the browser, so intervals cannot
  be tampered with and the logic is covered by unit tests instead of manual QA.
- **Stateless auth.** JWTs keep the API horizontally scalable and remove session storage, at the
  cost of not being able to revoke a token before it expires.
- **Ownership is enforced in the query, not after the fetch.** Every deck and card endpoint filters
  by `usuario_id` inside the SQL query, which makes IDOR-style access impossible by construction and
  keeps the check impossible to forget in a new endpoint.
- **Text is normalized on write.** Deck names are capitalized and card text is lowercased before
  being stored, so search and comparison stay predictable. This is a deliberate product decision
  for a study app, and it means the API returns the normalized form.
- **One process, one origin.** FastAPI serves the SPA as well as the API: no CORS, no second
  deployment, and `pytest` can exercise the exact app object that runs in production.
- **Spanish-first domain model.** Endpoint and column names are in Spanish (`mazos`, `tarjetas`,
  `usuarios`) while the code, docs and UI are internationalized. It reflects the project's origin and
  keeps the API consistent with its data model.

---

## Roadmap

- [ ] Alembic migrations (schema changes are currently `create_all`-only).
- [ ] Refresh-token flow so sessions survive the access-token lifetime.
- [ ] Rate limiting on the authentication endpoints.
- [ ] Deck-level statistics (retention curve, reviews per day).
- [ ] Import/export decks as JSON or CSV.
- [ ] API pagination for large collections.
- [ ] Public deployment so the live app is reachable from the README.

---

## Author

**Daniel Molina Inojosa** — Backend developer in training, focused on Python and FastAPI.

- GitHub: [@dbloodmoon](https://github.com/dbloodmoon)
- LinkedIn: [linkedin.com/in/danielmolinainojosa](https://linkedin.com/in/danielmolinainojosa)

---

## License

Released under the [MIT License](LICENSE).
