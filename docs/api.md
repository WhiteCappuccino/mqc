# API Overview

Base URL: `http://localhost:3000/api`

Swagger UI: `http://localhost:3000/docs`

## Auth

- `POST /auth/register`
  - Body: `{ "email": "user@example.com", "password": "Password123!" }`
  - Returns: `{ accessToken, userId, email, role }`
- `POST /auth/login`
  - Body: `{ "email": "user@example.com", "password": "Password123!" }`
  - Returns: `{ accessToken, userId, email, role }`

## Users

- `GET /users/me` (Bearer token)
  - Returns JWT profile payload: `{ sub, email, role }`

## Media

- `GET /media` (Bearer token)
  - User: own media only
  - Moderator/Admin: all media
- `GET /media/:id` (Bearer token)
  - Media details + analysis history + moderation decisions
- `POST /media` (Bearer token, multipart/form-data)
  - Fields: `title`, `description`, `type`, `file`
  - Stores file in MinIO and metadata in PostgreSQL
- `POST /media/:id/analyze` (Bearer token)
  - Calls analyzer service and persists result

## Moderation

Requires `MODERATOR` or `ADMIN`.

- `GET /moderation/queue`
  - Pending moderation candidates
- `POST /moderation/:mediaId/decision`
  - Body: `{ "status": "APPROVED" | "REJECTED" | "NEEDS_REVISION", "comment": "..." }`

## Reports

Requires `MODERATOR` or `ADMIN`.

- `GET /reports/media?format=csv|xlsx|pdf`
  - Returns downloadable report file

## Health

- `GET /health` (backend)
- `GET http://localhost:8000/health` (analyzer)
