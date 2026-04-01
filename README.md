# ICOSNET — IT Supervision & Incident Management Platform

A full-stack ITSM (IT Service Management) platform built during an internship at ICOSNET. It provides automated infrastructure monitoring, ITIL-compliant incident lifecycle management, SLA tracking, and analytics dashboards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5 · Django REST Framework · SimpleJWT |
| Task Queue | Celery 5 · Redis · django-celery-beat |
| Database | PostgreSQL 16 |
| Frontend | React Router v7 (framework mode) · TypeScript |
| UI | shadcn/ui · Tailwind CSS v4 · Recharts |
| Auth | JWT (access + refresh tokens, auto-rotation) |

---

## Features

- **Automated probes** — configurable PING / TCP / HTTP GET checks run every N minutes via Celery Beat; auto-creates CRITICAL incidents when a resource goes down
- **Incident lifecycle** — ITIL state machine: `NEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`; status transitions, assignment, comments, and full activity timeline
- **Asset management** — create, edit, and delete monitored resources (servers, routers, APIs) with live status badges
- **SLA tracking** — deadline auto-set on incident creation; breach detection via a periodic Celery task
- **Analytics** — MTTR (mean time to repair), uptime rate, top-failing assets charts
- **Notification settings** — SMTP, Slack webhook, Teams webhook configuration
- **User management** — admin-only panel to create, edit, activate/deactivate users with role-based access (ADMIN / TECHNICIAN)
- **Auto-refresh** — all data polling every 30 s via React Query


## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (for Redis & PostgreSQL, or run them natively)

### 1. Environment

```bash
cp .env.example .env
# Fill in DB_NAME, DB_USER, DB_PASSWORD, SECRET_KEY, etc.
```

### 2. Backend

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 3. Celery (separate terminals)

```bash
# Worker
python -m celery -A config worker -l info --pool=solo

# Beat scheduler
python -m celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

> `--pool=solo` is required on Windows due to multiprocessing limitations.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Vite proxies `/api/*`, `/admin/*`, and `/static/*` to Django on port 8000.

### One-click (Windows)

```bat
start.bat
```

Starts Redis (Docker), Django, Celery worker, and Vite in separate terminal windows.

---

## Docker (full stack)

```bash
docker compose up --build
```

Runs PostgreSQL, Redis, and the Django backend. Start the frontend separately with `npm run dev`.

---

## Default Credentials

After running `createsuperuser`, log in at `http://localhost:5173` with your chosen credentials.  
The Django admin panel is available at `http://localhost:5173/admin/`.

---

## API Overview

All endpoints are under `/api/` and require a Bearer JWT token except `/api/token/` and `/api/token/refresh/`.

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/token/` · `POST /api/token/refresh/` |
| Users | `GET/POST /api/users/` · `GET/PATCH /api/users/{id}/` |
| Assets | `GET/POST /api/assets/` · `GET/PATCH/DELETE /api/assets/{id}/` · `GET /api/assets/{id}/status-history/` |
| Incidents | `GET/POST /api/incidents/` · `GET/PATCH /api/incidents/{id}/` · `POST /api/incidents/{id}/transition/` · `POST /api/incidents/{id}/comments/` |
| Analytics | `GET /api/analytics/uptime/` · `GET /api/analytics/mttr/` · `GET /api/analytics/top-failing/` |
| Notifications | `GET/PATCH /api/notifications/settings/` |
