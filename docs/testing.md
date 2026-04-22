# Testing Guide

## Backend

Unit tests:

```bash
cd backend
npm test
```

Covers:

- `AuthService` registration token flow
- `RolesGuard` role authorization behavior

E2E tests:

```bash
cd backend
npm run test:e2e
```

Covers:

- `GET /api/health`

## Frontend

```bash
cd frontend
npm test
```

Covers:

- Login page form validation

## Analyzer

```bash
cd analyzer
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

Covers:

- health endpoint
- analysis endpoint response contract

## Optional Enhancements

- Add backend integration tests with disposable PostgreSQL
- Add frontend route tests for RBAC redirects
- Add analyzer tests for boundary payload sizes and media types
