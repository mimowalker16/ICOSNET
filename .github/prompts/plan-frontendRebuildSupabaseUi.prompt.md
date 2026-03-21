# Plan: Frontend Rebuild — Supabase UI + React Router v7

Scaffold a React Router v7 framework-mode project using shadcn's `init -t react-router`, install the requested Supabase UI client and auth blocks, then replace all Supabase backend calls with Axios + Django JWT. This reuses Supabase UI's polished visual components while keeping the Django REST API as the actual data source.

---

## Phase 1 — Scaffold (sequential, run in `C:/Users/mouay/Projects/ICOSNET`)

1. `npx shadcn@latest init -t react-router frontend` — creates React Router v7 framework project in `frontend/`. Produces `app/routes/`, `app/root.tsx`, `vite.config.ts` with `@react-router/dev/vite` plugin, and shadcn base CSS.
2. `cd frontend && npx shadcn@latest add @supabase/supabase-client-react-router` — user's requested command; adds `app/lib/supabase/client.ts` and `server.ts` scaffolding.
3. `npx shadcn@latest add @supabase/password-based-auth-react-router` — installs Supabase UI login/signup route files and form components.
4. `npx shadcn@latest add table badge select dialog separator card` — additional shadcn components needed for pages.
5. `npm install @tanstack/react-query axios recharts date-fns lucide-react` — runtime dependencies.

---

## Phase 2 — Core Infrastructure (*must complete before Phase 3*)

6. **Replace Supabase client** — overwrite `app/lib/supabase/client.ts` with an Axios instance (base URL `/api/`, Bearer token interceptor, 401 → redirect to `/login`). The Supabase client stub prevents crashes in any leftover block code.
7. **Auth utilities** — create `app/lib/auth.ts`: `login(username, password)` calls `POST /api/auth/login/`, stores `access`+`refresh` in `localStorage`. `logout()` clears storage.
8. **AuthContext** — `app/store/AuthContext.tsx`: `AuthProvider`, `useAuth()` hook exposing `user`, `isAdmin`, `login`, `logout`.
9. **React Query setup** — wrap `app/root.tsx` with `QueryClientProvider` + `AuthProvider`.
10. **Service layer** — `app/lib/services/assets.ts`, `incidents.ts`, `analytics.ts`, `users.ts` — typed Axios functions covering all 9 pages' data needs.
11. **TypeScript types** — `app/types/index.ts` (Asset, Incident, IncidentLog, User, StatusLog, Analytics).
12. **Vite proxy** — add `server: { proxy: { '/api': 'http://localhost:8000' } }` in `vite.config.ts` so dev frontend hits Django without CORS.
13. **ICOSNET branding** — in `app/app.css`, override shadcn CSS vars: `--primary` → oklch equivalent of `#2563EB`, `--primary-foreground` → white.

---

## Phase 3 — Pages (*parallel pairs after Phase 2 is complete*)

| Route file | Description |
|---|---|
| `app/routes/login.tsx` | Adapt Supabase UI login form — swap `supabase.auth.signIn` call with `AuthContext.login()`. Remove sign-up link (admin creates users). |
| `app/routes/dashboard.tsx` | 4 KPI cards (total assets, up%, open incidents, breached SLAs) + asset status grid + recent incidents table. |
| `app/routes/assets._index.tsx` | Searchable/filterable table with UP/DOWN/DEGRADED badges. Link to detail. |
| `app/routes/assets.new.tsx` | Create form — name, IP/URL, type select, check_type select, port, interval. |
| `app/routes/assets.$id.tsx` | Asset info cards + Recharts `<AreaChart>` of last 24h response time + linked incidents list. |
| `app/routes/incidents._index.tsx` | Table with status/severity/SLA columns, multi-select filter bar. |
| `app/routes/incidents.new.tsx` | Manual ticket form — asset selector, title, description, severity. |
| `app/routes/incidents.$id.tsx` | ITIL transition buttons (ASSIGN → IN_PROGRESS → RESOLVE → CLOSE) + activity timeline + comment textarea. |
| `app/routes/analytics.tsx` | 4 Recharts widgets: MTTR bar chart, top failing assets, uptime % table, severity pie chart. |
| `app/routes/settings.tsx` (nested) | Admin-only guard; tabs for Users CRUD + Notifications webhook config. |

---

## Phase 4 — Verification

1. `npm run typecheck` — 0 TypeScript errors.
2. `npm run build` — clean Vite/React Router bundle.
3. `npm run dev` → open browser → login with `admin` / `admin123` against running Django backend.
4. Manually verify: asset list loads, create incident, SLA badge shows on incidents._index.

---

## Files to Create/Modify

- `frontend/vite.config.ts` — add proxy and confirm `@react-router/dev/vite` plugin
- `frontend/app/root.tsx` — add providers
- `frontend/app/app.css` — ICOSNET color override
- `frontend/app/lib/supabase/client.ts` — overwrite with Axios instance
- `frontend/app/lib/auth.ts`, `frontend/app/store/AuthContext.tsx` — new
- `frontend/app/lib/services/*.ts` — new (4 files: assets, incidents, analytics, users)
- `frontend/app/types/index.ts` — new
- All 10 route files in `frontend/app/routes/` — new

---

## Decisions

- React Router v7 framework mode (file-based routes, `app/` dir) — matches what Supabase UI registry expects
- Supabase UI blocks installed as visual base; all `supabase.*` calls replaced with Axios before any page work starts
- No SSR/server loaders used — all data fetching via React Query in client components (simplest for a Django REST SPA)
- `localhost:5173` proxies `/api/*` to `localhost:8000` — no CORS config changes needed in Django for dev

## Scope Exclusions

- No Supabase backend, no Supabase Auth, no real-time subscriptions
- No OAuth / social login (not needed per requirements)
- No test suite (not part of original scope)
