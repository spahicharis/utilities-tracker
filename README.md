# Utilities Tracker

Initial project scaffold with:
- `backend`: Node.js + Express API
- `frontend`: React app (Vite + Tailwind CSS)

## Quick Start

### 1) Configure environment files

Copy example env files:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Notes:
- `BACKEND_PORT` and `FRONTEND_PORT` are used as shared defaults.
- `VITE_API_BASE_URL` is optional. If empty, frontend calls `/api` and uses Vite proxy to backend.

### 2) Install dependencies

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 3) Run apps

Backend:
```bash
npm run dev:backend
```

Frontend:
```bash
npm run dev:frontend
```

Default ports:
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

Health endpoint:
- Backend: `GET /api/health`

Tailwind config files:
- `frontend/tailwind.config.cjs`
- `frontend/postcss.config.cjs`

## Backend API

Data is persisted in Supabase Postgres using `POSTGRES_DB_URL`.
On startup, the backend creates `providers` and `bills` tables automatically if they do not exist.

Providers:
- `GET /api/providers`
- `POST /api/providers` with body `{ "name": "Water Supply", "address": "Main St 1", "phone": "+387 33 000 000", "logo": "https://..." }`
- `DELETE /api/providers/:name`

Bills:
- `GET /api/bills?month=YYYY-MM&year=YYYY`
- `POST /api/bills` with body:
  `{ "provider": "Electricity", "amount": 120.55, "billDate": "2026-03-01", "billingMonth": "2026-03", "status": "Pending" }`
- `POST /api/bills/import` with body:
  `{ "provider": "Electricity", "year": "2026", "status": "Pending", "csv": "100 KM\n24 KM\n35 KM" }`
  (newline-delimited values are mapped to January onward in the selected year; max 12 values)
- `PATCH /api/bills/:id/status` with body `{ "status": "Paid" }`
- `DELETE /api/bills/:id`

Dashboard:
- `GET /api/dashboard?year=2026`
