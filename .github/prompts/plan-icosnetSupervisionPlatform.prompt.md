# Plan: ICOSNET IT Supervision & Incident Management Platform

**TL;DR:** An internal ITSM web app that monitors infrastructure assets (Servers, Routers, APIs) via automated probes, auto-generates ITIL-compliant incident tickets on failure, and exposes real-time dashboards and KPIs — built on Django + React + PostgreSQL + Celery/Redis deployed via Docker Compose.

---

## System Architecture

```
[ React SPA (Nginx) ]
        ↕  REST/JSON + JWT
[ Django REST Framework (Gunicorn) ]
        ↕                      ↕
[ PostgreSQL ]       [ Celery Workers + Beat ]
                             ↕          ↕
                         [ Redis ]   [ Probe Scripts ]
                                         ↕
                            [ SMTP / Slack / Teams Webhooks ]
```

---

## Database Schema (7 Tables)

| Table | Key Fields |
|---|---|
| `users` | id, username, email, password, role (ADMIN\|TECHNICIAN), is_active |
| `assets` | id, name, ip_address_or_url, asset_type (SERVER\|ROUTER\|API), check_type (PING\|TCP\|HTTP_GET), check_port, check_interval_minutes, is_active |
| `asset_status_logs` | id, asset (FK), status (UP\|DOWN\|DEGRADED), response_time_ms, error_message, checked_at |
| `incidents` | id, title, description, asset (FK nullable), severity (CRITICAL\|HIGH\|MEDIUM\|LOW), status (NEW\|ASSIGNED\|IN_PROGRESS\|RESOLVED\|CLOSED), source (SYSTEM\|MANUAL), created_by, assigned_to, sla_deadline, resolved_at, closed_at |
| `incident_logs` | id, incident (FK), actor, action_type (STATUS_CHANGE\|COMMENT\|ASSIGNMENT\|SYSTEM_NOTE), old_value, new_value, comment, created_at |
| `sla_policies` | id, severity, resolution_hours (seeded: Critical=1, High=4, Medium=8, Low=24) |
| `notification_logs` | id, incident (FK), channel (EMAIL\|SLACK\|TEAMS), recipient_or_target, success, error_message, sent_at |
| `notification_settings` | smtp config fields + slack_webhook_url + teams_webhook_url |

---

## Pages / UI Routes

| Route | Description |
|---|---|
| `/login` | JWT login form |
| `/dashboard` | Real-time asset map (green/orange/red cards), open incident counters by severity, SLA breach count |
| `/assets` | Asset table with status badge, last check time, uptime % |
| `/assets/new` | Create asset form |
| `/assets/:id` | Asset detail: info, status history charts (uptime + response time), linked incidents |
| `/incidents` | Filterable incident table (status, severity, assignee, date, asset) |
| `/incidents/new` | Manual ticket creation |
| `/incidents/:id` | Ticket detail: lifecycle timeline, status transition buttons, assign dropdown, comment input, full audit log |
| `/analytics` | MTTR trend, Top 5 failing assets, Monthly uptime per asset, Incidents by severity — + PDF/Excel export |
| `/settings/users` | Admin: create/edit/disable technicians |
| `/settings/notifications` | Admin: SMTP + Slack/Teams webhook config |

---

## Data Workflows

### Supervision (Celery Beat, runs every N min per asset)

```
For each active asset:
  → Run probe (Ping / TCP socket / HTTP GET)
  → Save result → asset_status_logs
  → If DOWN:
      → Is there already an open incident for this asset?
          NO  → Create Incident (source=SYSTEM, severity=CRITICAL)
               → Compute sla_deadline = now + 1h
               → Send Email + Slack/Teams notification
          YES → Skip (no duplicate)
  → If UP and an open SYSTEM incident exists:
      → Auto-resolve incident (resolved_at = now)
      → Write SYSTEM_NOTE to incident_logs
      → Send RECOVERY notification
```

### ITIL Incident Lifecycle

```
NEW → (assign) → ASSIGNED → (start work) → IN_PROGRESS → (fix) → RESOLVED → (close) → CLOSED
```

Every transition writes a row to `incident_logs`. SLA Breach Monitor (Celery Beat, every 15 min) scans open tickets past `sla_deadline` and sends breach alerts.

### Notification Service

```
Trigger (new critical incident / SLA breach / recovery)
  → NotificationService.dispatch(incident, event_type)
      → EmailNotifier    — Django send_mail via SMTP
      → SlackNotifier    — HTTP POST to configured webhook URL
      → TeamsNotifier    — HTTP POST to configured webhook URL
      → Log result in notification_logs (success / fail)
```

---

## API Endpoints (DRF)

### Auth
- `POST /api/auth/login/` — returns JWT access + refresh tokens
- `POST /api/auth/token/refresh/`
- `GET  /api/auth/me/`

### Assets
- `GET  /api/assets/`
- `POST /api/assets/`
- `GET  /api/assets/:id/`
- `PATCH /api/assets/:id/`
- `DELETE /api/assets/:id/`
- `GET  /api/assets/:id/status-history/`

### Incidents
- `GET  /api/incidents/`
- `POST /api/incidents/`
- `GET  /api/incidents/:id/`
- `PATCH /api/incidents/:id/`
- `POST /api/incidents/:id/transition/` — body: `{ "new_status": "..." }`
- `GET  /api/incidents/:id/logs/`
- `POST /api/incidents/:id/logs/` — add comment

### Analytics
- `GET /api/analytics/mttr/?period=30d`
- `GET /api/analytics/top-failing/?limit=5`
- `GET /api/analytics/uptime/?period=30d`
- `GET /api/analytics/incidents-by-severity/`

### Export
- `GET /api/export/incidents/?format=pdf|excel&from=&to=`

### Settings (Admin only)
- `GET  /api/settings/notifications/`
- `PUT  /api/settings/notifications/`
- `GET  /api/users/`
- `POST /api/users/`
- `GET  /api/users/:id/`
- `PATCH /api/users/:id/`

---

## Project Structure

```
icosnet-platform/
├── backend/
│   ├── config/              # settings.py, urls.py, celery.py, wsgi/asgi
│   ├── users/               # CustomUser model, JWT auth views, permissions
│   ├── assets/              # Asset, AssetStatusLog models + Celery probe tasks
│   ├── incidents/           # Incident, IncidentLog models + lifecycle logic
│   ├── notifications/       # Email + Slack/Teams notification service
│   ├── analytics/           # KPI aggregation views
│   └── settings_config/     # NotificationSettings model + views
├── frontend/
│   └── src/
│       ├── pages/           # Dashboard, Assets, Incidents, Analytics, Settings
│       ├── components/      # StatusBadge, IncidentTimeline, KpiChart, etc.
│       ├── hooks/           # useAssets(), useIncidents(), useAnalytics()
│       ├── services/        # Axios instance + API call functions
│       └── store/           # AuthContext + React Query
├── docker-compose.yml       # services: db, redis, backend, celery, frontend, nginx
└── nginx.conf
```

---

## Implementation Phases

### Phase 1 — Foundation (Weeks 1–3)

1. Finalize ERD + create Django models + migrations
2. JWT auth (`djangorestframework-simplejwt`) + role-based permissions (IsAdmin, IsTechnician)
3. CRUD APIs for `assets`, `incidents`, `users` via DRF ViewSets
4. Seed `sla_policies` table

**Deliverable:** Postman-testable REST API

---

### Phase 2 — Supervision Engine (Weeks 4–6)

1. Redis + Celery Docker service setup
2. Probe scripts: Ping (`subprocess`), TCP (`socket`), HTTP GET (`requests`)
3. Celery periodic task: run probes → log results → auto-create incidents
4. SLA breach monitor Celery Beat task (runs every 15 min)
5. `NotificationService` dispatching to Email + Slack + Teams

**Deliverable:** System detects an offline server, creates a ticket, and sends notifications automatically

---

### Phase 3 — React Frontend (Weeks 7–10)

1. Vite + React, React Router v6, Axios, Recharts, React Query setup
2. Auth flow: login page, JWT storage (httpOnly cookie), protected route guards
3. Dashboard page: asset status map + summary counters
4. Assets pages: list, create, detail with history charts
5. Incidents pages: filterable list, detail with lifecycle timeline, manual creation
6. Analytics page: MTTR, Top 5 failures, Uptime %, Incidents by severity

**Deliverable:** Complete navigable web application

---

### Phase 4 — Polish & Deploy (Weeks 11–12)

1. PDF export (`WeasyPrint`) + Excel export (`openpyxl`) on backend
2. Settings pages: user management + notification config UI
3. Docker Compose full packaging + Nginx reverse proxy config
4. Technical and user documentation

**Deliverable:** Production-ready internal deployment

---

## Key Decisions

| Concern | Decision |
|---|---|
| Roles | Admin + Technician |
| Notifications | Email SMTP + Slack webhook + Teams webhook |
| Asset types | Server, Router, API |
| SLA | Fixed per severity: Critical=1h, High=4h, Medium=8h, Low=24h |
| Charts library | Recharts (native React ecosystem) |
| JWT storage | httpOnly cookie (preferred for security) |
| Deployment | Docker Compose on internal on-premise Linux server |
| State management | AuthContext for auth, React Query for server state |
| Task queue | Celery + Redis (Beat scheduler for periodic probes) |
| ORM / DB | Django ORM + PostgreSQL (ACID, full audit trail) |
