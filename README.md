# Utilities Tracker

Utility bill tracking app with:
- `backend`: Node.js + Express + Supabase Postgres
- `frontend`: React (Vite + Tailwind CSS)

## ✨ Highlights
- 🔐 Supabase email/password sign-in with backend Bearer token verification
- 📌 Provider management with `name`, `address`, `phone`, `logo`
- 🧾 Bills with `amount`, `currency` (default `KM`), status, dates
- 📥 Bulk import bills via newline-delimited CSV text
- 📊 Dashboard with line and pie charts
- 🚨 Unpaid bills section (pending + overdue cards)

## 🚀 Quick Start

### 1) Configure environment files

macOS/Linux:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Important vars:
- `POSTGRES_DB_URL`: Supabase Postgres connection string
- `BACKEND_PORT`: backend port (default `5005`)
- `FRONTEND_PORT`: frontend port (default `5173`)
- `SUPABASE_URL`: Supabase project URL used by backend token verifier
- `VITE_SUPABASE_URL`: Supabase project URL used by frontend auth client
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key used by frontend auth client
- `VITE_API_BASE_URL`: optional frontend override (empty = Vite proxy to `/api`)

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

Default local URLs:
- 🔧 Backend: `http://localhost:5005`
- 🖥️ Frontend: `http://localhost:5173`

Health check:
- ✅ `GET /api/health`

## 🗄️ Database

Backend uses Supabase Postgres via `POSTGRES_DB_URL`.
On startup, the API auto-creates/updates required tables/columns (`providers`, `bills`).

## 🔌 Backend API

Most API routes require `Authorization: Bearer <supabase_access_token>`.
Public route:
- `GET /api/health`

### Auth
- Frontend performs auth directly with Supabase (`signInWithPassword`).
- Backend validates Supabase access tokens via the project's JWKS endpoint.

### Providers
- `GET /api/providers`
- `POST /api/providers`
  - body: `{ "name": "Water Supply", "address": "Main St 1", "phone": "+387 33 000 000", "logo": "https://..." }`
- `PATCH /api/providers/:name`
  - body: `{ "name": "Water Supply Updated", "address": "Main St 2", "phone": "+387 33 111 111", "logo": "https://..." }`
- `DELETE /api/providers/:name`

### Bills
- `GET /api/bills?month=YYYY-MM&year=YYYY`
- `POST /api/bills`
  - body: `{ "provider": "Electricity", "amount": 120.55, "currency": "KM", "billDate": "2026-03-01", "billingMonth": "2026-03", "status": "Pending" }`
- `POST /api/bills/import`
  - body: `{ "provider": "Electricity", "year": "2026", "currency": "KM", "status": "Pending", "csv": "100 KM\n24 KM\n35 KM" }`
  - notes:
    - each line = one amount (newline-delimited)
    - mapped from January onward in selected year
    - max 12 lines per import
    - `currency` defaults to `"KM"` when omitted
- `PATCH /api/bills/:id/status`
  - body: `{ "status": "Paid" }`
- `DELETE /api/bills/:id`

### Dashboard
- `GET /api/dashboard?year=2026`
- Includes:
  - summary cards
  - yearly spend line chart data
  - status split data
  - top providers data
  - unpaid bills list
