# Utilities Tracker

Initial project scaffold with:
- `backend`: Node.js + Express API
- `frontend`: React app (Vite)

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
