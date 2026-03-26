# AGENTS.md

## Description
- Utilities Tracker is an internal app for managing utility providers, tracking monthly bills, importing historical bill data from spreadsheets, and reviewing yearly analytics such as spend trends, provider breakdowns, and unpaid bills.

## Project
- Monorepo with `backend/` and `frontend/`.
- Backend: Express + Postgres (`pg`) using `POSTGRES_DB_URL`.
- Frontend: React + Vite + Tailwind.

## Run
- Install: `npm install`, `npm --prefix backend install`, `npm --prefix frontend install`
- Backend dev: `npm run dev:backend`
- Backend start: `npm run start:backend`
- Frontend dev: `npm run dev:frontend`
- Frontend build: `npm run build:frontend`

## Env
- Root `.env` holds shared values.
- Important vars:
  - `POSTGRES_DB_URL`
  - `BACKEND_PORT` default `5005`
  - `FRONTEND_PORT` default `5173`
  - `VITE_API_BASE_URL`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Notes
- Backend auto-creates/updates `providers` and `bills` tables on startup.
- Providers support `name`, `address`, `phone`, `logo`.
- Bills support `amount`, `currency` (default `KM`), status, dates, and bulk import.
- Dashboard includes yearly trend, pie charts, and unpaid bills cards.

## Conventions
- Keep API responses simple and frontend-friendly.
- Prefer `rg` for search.
- Use `apply_patch` for manual edits.
- Do not revert unrelated user changes in the worktree.
