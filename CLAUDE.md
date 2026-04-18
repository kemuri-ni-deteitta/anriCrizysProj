# CLAUDE.md

## Project overview

This project is an offline desktop application called **"Тренажёр антикризисного управления"**.

It is an educational simulator for students: users go through crisis scenarios in an IT company, make decisions step by step, optionally explain their reasoning, and receive diagnostic analytical feedback.

The main goal is **not scoring**, but **primary diagnostics of the student's thinking**, including strengths, blind spots, and areas for discussion with a teacher.

---

## Core constraints

- This is an **offline-first desktop application**
- It must work **without internet access**
- It uses **flat JSON storage**, not a database
- Frontend and backend communicate through a **local REST API on localhost**
- The main target platform is **Windows desktop (.exe)**
- Do not redesign this into SaaS, cloud-first, or internet-dependent architecture unless explicitly requested

---

## Language rules

### Internal development language
- Code comments may be in English
- Technical architecture notes may be in English
- Developer-facing documentation may be in English

### User-facing language
**Everything the end user sees inside the application must remain in Russian unless explicitly requested otherwise.**

This includes:
- UI labels
- buttons
- menu items
- page titles
- modal titles
- placeholders
- validation messages
- error messages shown to the user
- hints and helper text
- test questions and answers
- result analysis text
- dashboard labels
- calendar labels
- profile fields
- admin panel UI
- PDF reports
- DOCX reports
- exported user-visible content

Do **not** translate user-facing text into English unless explicitly requested.

---

## Tech stack

### Frontend
- Electron 33.x
- React 18.x
- React Router 6.x
- Vite / electron-vite
- electron-builder for Windows packaging

### Backend
- Python 3.10
- FastAPI
- Uvicorn
- ReportLab for PDF generation
- python-docx for DOCX generation
- PyInstaller for backend packaging

### Storage
- No database
- All persistent data is stored as JSON files under `data/`

---

## High-level architecture

```text
Electron Shell
└── React SPA (renderer)
    └── HTTP requests to localhost:8000
        └── FastAPI backend
            └── Flat JSON storage in data/
````

### Architecture rules

* Keep Electron as the desktop shell
* Keep React responsible for UI and interaction flow
* Keep FastAPI responsible for storage, validation, business logic, and report generation
* Preserve localhost-based communication
* Do not introduce remote backend dependencies unless explicitly requested

---

## Project structure

Typical structure:

```text
frontend/
  src/
    main/
    preload/
    renderer/

backend/
  routes/
  config.py
  storage.py
  seed.py
  main.py

data/
.github/workflows/
```

### Responsibilities

#### Frontend

* UI rendering
* navigation
* local interaction flow
* calling backend API

#### Backend

* file storage access
* validation
* user / topic / test / session logic
* report generation
* seeding initial data

---

## Data storage layout

```text
data/
├── user.json
├── avatars/
├── sessions/
└── tests/
    ├── topics.json
    ├── cybersecurity/
    ├── hr_crisis/
    ├── financial/
    ├── operational/
    ├── strategic/
    ├── project/
    └── regulatory/
```

### Storage notes

* `user.json` stores the current local user profile
* `sessions/*.json` stores attempts and progress
* `tests/**/*.json` stores test definitions
* `topics.json` stores topic metadata
* avatar files are stored in `data/avatars/`

### Storage rules

* All writes must remain **atomic**
* Write to a temporary file first, then replace the target file
* Do not replace atomic writes with direct unsafe writes
* Be careful with backward compatibility of stored JSON files

---

## Main domain entities

### User

Represents the current local student profile.

Typical fields:

* `id`
* `last_name`
* `first_name`
* `group`
* `avatar_path`
* `created_at`

### Topic

Represents a test category.

Typical fields:

* `id`
* `name`
* `color_key`
* `icon_key`

### Test

Represents one crisis scenario with multiple questions.

Typical fields:

* `id`
* `topic_id`
* `title`
* `description`
* `analysis_good`
* `analysis_improve`
* `questions[]`

### Question

Represents one decision point inside a test.

Typical fields:

* `id`
* `order`
* `text`
* `type` (`single` or `multiple`)
* `explanation`
* `answers[]`

### Answer

Represents one answer option.

Typical fields:

* `id`
* `text`
* `time_hours`
* `cost_rub`
* `hint`
* `is_correct`

### Session

Represents one completed or in-progress attempt.

Typical fields:

* `id`
* `test_id`
* `topic_id`
* `started_at`
* `finished_at`
* `answers[]`

---

## API areas

Typical backend route groups:

* `/api/user`
* `/api/topics`
* `/api/tests`
* `/api/sessions`
* `/api/reports`
* `/api/admin`
* `/api/dashboard`

### API rules

* Keep naming consistent
* Preserve offline/local assumptions
* Avoid unnecessary endpoint proliferation
* Prefer simple and predictable request/response structures

---

## Development commands

### Run backend in development

```bash
CRISIS_DATA_DIR=./data backend/.venv/bin/uvicorn main:app \
  --app-dir backend --host 127.0.0.1 --port 8000
```

### Run frontend in development

```bash
npm run dev --prefix frontend
```

### Build Windows package

```bash
npm run package:win --prefix frontend
```

> If actual commands change, update this file immediately.

---

## Testing guidance

Automated tests may currently be limited or absent.

When adding tests:

* prefer small focused tests
* prioritize backend logic first
* keep fixtures simple and file-based
* do not overcomplicate architecture just to satisfy a test framework

Good candidates for tests:

* JSON read/write utilities
* atomic write behavior
* validation logic
* session aggregation
* report generation helpers
* dashboard calculations

---

## Coding conventions

### Backend

* Use `snake_case`
* Prefer `pathlib.Path` over raw string paths
* Keep file I/O logic centralized
* Keep route modules separated by feature
* Use Pydantic models where appropriate
* Preserve atomic write behavior
* Treat JSON schema changes carefully

### Frontend

* Use `PascalCase` for React components
* Keep route/page structure clear
* Prefer small reusable components
* Keep API calls centralized in a thin API layer
* Keep the UI simple and uncluttered
* Preserve Russian user-facing text

---

## Product principles

* This is an educational simulator, not a generic quiz engine
* Results and reports should emphasize explanation, reasoning, strengths, and improvement areas
* Keep the product focused on diagnostic value, not gamification
* Do not introduce leaderboard or ranking mechanics unless explicitly requested

---

## Known sensitive areas

Treat these carefully:

* concurrent writes to JSON files
* backward compatibility of `sessions/*.json`
* backward compatibility of report generation
* deleting entities that may leave orphaned files
* admin authentication and credential handling
* backend process stability inside Electron

When changing storage or domain structure, think about migration and compatibility.

---

## Safe change workflow

When making changes:

1. Identify which files and JSON entities are affected
2. Check whether old session files must remain readable
3. Keep the change minimal and local
4. Preserve report compatibility unless explicitly changing report format
5. Avoid broad rewrites when a targeted fix is enough
6. Do not introduce new infrastructure unless necessary

---

## What to inspect first

Depending on the task, inspect:

* `backend/main.py` for backend startup and routing
* `backend/config.py` for paths and runtime configuration
* `backend/storage.py` for JSON persistence and atomic writes
* `backend/routes/` for API behavior
* `frontend/src/renderer/` for UI screens and flows
* `data/tests/` for real test content examples
* `data/sessions/` for persisted session format examples

---

## Change guidelines for Claude

When working on this project:

1. Preserve offline-first architecture
2. Preserve JSON-based storage unless explicitly told otherwise
3. Preserve localhost communication between frontend and backend
4. Keep the educational diagnostic purpose in mind
5. Do not turn the product into a cloud service or generic quiz app
6. Keep all user-facing UI and report text in Russian
7. Prefer incremental changes over rewrites
8. Avoid unnecessary dependencies
9. Respect the existing file structure and domain model
10. Keep the Windows packaging flow working

---

## Clarify before major changes

Before large refactors, verify:

* whether old `session_*.json` files must remain compatible
* whether report layout or content must remain stable
* whether admin credentials are temporary or intentional for the current stage
* whether the change targets prototype, diploma, demo, or production-like usage

---

## Out of scope by default

Do not add these unless explicitly requested:

* cloud backend
* remote synchronization
* multiplayer
* mobile version
* push notifications
* third-party auth providers
* remote analytics
* student ranking / leaderboard
* DB migration to PostgreSQL / SQLite / other database engines

---

## Before finishing a task

Before considering work done:

1. Check affected backend and frontend files for consistency
2. Verify JSON read/write logic if storage was touched
3. Verify compatibility of changed API contracts
4. Keep all user-facing text in Russian
5. Avoid leaving dead code or unused imports
6. If commands or structure changed, update this file

---

## Short summary

This project is a local offline educational desktop simulator for crisis-management training in IT scenarios.

Its essence is:

* scenario-based decision making
* explanation of choices
* diagnostic analysis
* PDF / DOCX report generation
* simple local JSON storage
* teacher-managed content

