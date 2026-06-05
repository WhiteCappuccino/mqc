# Media Quality Control Platform

Платформа для автоматизированного контроля качества медиаконтента:
- загрузка и хранение материалов
- автоматические проверки качества
- ручная модерация
- совместная работа через комментарии и доступы
- аналитика, аудит и отчеты

## Технологический стек

- Frontend: React + TypeScript + Vite + MUI
- Backend: NestJS + Prisma + PostgreSQL + JWT + RBAC + MinIO
- Analyzer: Python + FastAPI
- Reports: CSV / XLSX / PDF
- Deployment: Docker Compose

## Структура проекта

- `frontend` — пользовательский интерфейс
- `backend` — API и бизнес-логика
- `analyzer` — сервис автоматической проверки контента
- `docs` — дополнительная документация

## Требования

- Docker + Docker Compose
- Node.js 20+ и npm (для локальной разработки без Docker)
- Python 3.11+ (для локального analyzer)

## Быстрый запуск через Docker

```bash
docker compose up --build -d
```

Сервисы:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/docs`
- Analyzer health: `http://localhost:8000/health`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- PostgreSQL: `localhost:5433`

После первого запуска примените схему БД и сиды:

```bash
cd backend
npm run prisma:generate
npm run prisma:push -- --force-reset
npm run prisma:seed
```

## Локальная разработка (без docker backend/frontend)

### 1) Инфраструктура

```bash
docker compose up -d postgres minio analyzer
```

### 2) Backend

```bash
cd backend
cp .env.example .env
```

Для запуска с хоста Linux/macOS укажите в `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/media_quality?schema=public
```

Затем:

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run start:dev
```

### 3) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 4) Analyzer (локально)

```bash
cd analyzer
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## SMTP (email-уведомления)

Чтобы работали реальные письма (верификация, reset password, уведомления), заполните в `backend/.env`:

```env
FRONTEND_URL=http://localhost:5173
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@media-quality.local
SMTP_SECURE=false
```

Если SMTP не заполнен, уведомления будут сохраняться только внутри системы.

## Тесты и сборка

### Backend

```bash
cd backend
npm run build
npm test -- --runInBand
npm run test:e2e
```

### Frontend

```bash
cd frontend
npm run build
npm test
```

### Analyzer

```bash
cd analyzer
. .venv/bin/activate
pytest -q
```

## Использование платформы

## 1. Гость

- Открыть главную страницу `/`
- Зарегистрироваться `/register`
- Войти `/login`
- Восстановить пароль `/forgot-password`
- Подтвердить email `/verify-email`

## 2. Пользователь

- `Dashboard` (`/dashboard`):
  - просмотр своих и доступных материалов
  - поиск и фильтры (тип, статус, критичность, автор, дата)
  - сортировки (дата, качество, популярность, статус)
- `Upload` (`/upload`):
  - загрузка файла или по URL
  - задание метаданных (название, описание, тип, теги, категория)
  - отправка на автопроверку
- `Media Details` (`/media/:id`):
  - запуск автопроверки
  - история проверок и нарушений
  - добавление комментариев к материалу и к дефекту
  - управление доступами
  - загрузка новой версии материала
  - просмотр истории версий и аудит-лога
- `Favorites` (`/favorites`)
- `Collections` (`/collections`)
- `Notifications` (`/notifications`)
- `Profile` (`/profile`)

## 3. Модератор

- `Moderation` (`/moderation`):
  - очередь модерации
  - финальное решение: `APPROVED` / `REJECTED` / `NEEDS_REVISION`
  - ручное добавление нарушений
  - пометка нарушений как false positive

## 4. Администратор

- `Admin` (`/admin`):
  - управление пользователями, ролями, статусами
  - управление критериями проверки
  - управление словарем нарушений
  - управление системными настройками
  - просмотр журнала аудита
  - изменение статусов материалов
  - удаление материалов
  - аналитика
  - выгрузка отчетов CSV/XLSX/PDF, в том числе за период

## Дефолтный администратор

- Email: `admin@example.com`
- Password: `Admin123!`

## Полезные ссылки

- API: `http://localhost:3000/docs`
- Доп. документация: [docs/api.md](docs/api.md), [docs/testing.md](docs/testing.md), [docs/check-templates.md](docs/check-templates.md)
