# Media Quality Control System

Diploma project implementation for automated media quality control and moderation.

## Stack

- Frontend: React + TypeScript + Vite + MUI
- Backend: NestJS + Prisma + PostgreSQL + JWT + RBAC + MinIO
- Analyzer: Python + FastAPI
- Reports: CSV / XLSX / PDF
- Deployment: Docker Compose

## Architecture

- `frontend`: user UI (auth, media upload, dashboard, moderation, admin report downloads)
- `backend`: core domain API and orchestration (auth, media, moderation, reports)
- `analyzer`: automatic media check service with deterministic rule-based scoring
- `postgres`: relational data
- `minio`: object storage for uploaded media

## Quick Start (Docker)

```bash
docker compose up --build
```

Available services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/docs`
- Analyzer: `http://localhost:8000/health`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001` (`minioadmin` / `minioadmin`)
- PostgreSQL host port: `localhost:5433`

Default seeded admin:

- `admin@example.com`
- `Admin123!`

## Local Development

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run start:dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Analyzer

```bash
cd analyzer
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Tests

### Backend

```bash
cd backend
npm test
npm run test:e2e
```

### Frontend

```bash
cd frontend
npm test
```

### Analyzer

```bash
cd analyzer
. .venv/bin/activate
pytest -q
```

## Core Workflows

1. User registers/logs in.
2. User uploads media and metadata.
3. User triggers automatic analysis.
4. System stores analysis score and violations.
5. Moderator reviews queue and submits final decision.
6. Admin exports reports in CSV/XLSX/PDF.

## Documentation

- API details: `docs/api.md`
- Testing notes: `docs/testing.md`
