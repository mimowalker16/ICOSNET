# Plan: Flexible RBAC System

## Context

ITSM app (Django + React Router v7). Currently has a hardcoded `role` CharField on `User` (`ADMIN` | `TECHNICIAN`). Replace with a DB-backed `Role` model carrying ITSM-specific permission codenames. Admin can create roles with any combination of permissions and assign them when creating new users. Full per-endpoint enforcement on the backend. Frontend gates nav and routes based on the permission list returned from `/api/auth/me/`.

---

## Decisions

- Role UX: Pick existing role OR create new role inline during user creation
- Only `ADMIN` system role seeded (`TECHNICIAN` to remove)
- Full per-endpoint permission enforcement on backend
- Existing TECHNICIAN users temporarily assigned ADMIN role in data migration (admin reassigns/deletes after)

---

## Permission codenames (ITSM-specific)

| Codename | Label |
|---|---|
| `view_assets` | View Assets |
| `create_asset` | Create Asset |
| `edit_asset` | Edit Asset |
| `delete_asset` | Delete Asset |
| `view_incidents` | View Incidents |
| `create_incident` | Create Incident |
| `assign_incident` | Assign Incident |
| `transition_incident` | Transition Incident Status |
| `close_incident` | Close Incident |
| `comment_incident` | Comment on Incident |
| `view_analytics` | View Analytics |
| `manage_notifications` | Manage Notification Settings |
| `manage_users` | Manage Users & Roles |

---

## Phase 1 — Backend models

### `users/app_permissions.py` (new)
Define the 13 codenames as a typed constant — single source of truth used by migrations and permission factory.

### `users/models.py`
Replace inner `Role` TextChoices with two new models:

- `AppPermission(codename, name)` — catalog of valid codenames; seeded via data migration; immutable.
- `Role(name, description, is_admin, is_system, permissions M2M AppPermission)` — `is_admin=True` bypasses all checks; `is_system=True` prevents deletion via API.
- `User.role_legacy` — rename existing `role` CharField temporarily during migration.
- `User.role = ForeignKey(Role, null=True, on_delete=PROTECT)` — made non-nullable after data migration.
- Keep `is_admin` property: `return self.role.is_admin if self.role else False`.

### Migrations
1. Schema migration (auto via `makemigrations`)
2. Data migration (hand-written `RunPython`):
   - Seed all 13 `AppPermission` rows
   - Create `ADMIN` role (`is_admin=True, is_system=True`, all permissions)
   - Map `role_legacy='ADMIN'` users → ADMIN FK; TECHNICIAN users → ADMIN FK (temporary)
   - Make `role` non-nullable, drop `role_legacy`

---

## Phase 2 — Backend permissions

### `users/permissions.py`
- Update `IsAdmin` / `IsAdminOrReadOnly` to use `role.is_admin`.
- Add `require_perm(codename)` factory — returns a `BasePermission` subclass that:
  - Grants unconditionally if `user.role.is_admin`
  - Otherwise checks `user.role.permissions.filter(codename=codename).exists()`

---

## Phase 3 — Serializers

### `users/serializers.py`
- `AppPermissionSerializer(id, codename, name)`
- `RoleSerializer(id, name, description, is_admin, is_system, permissions[])` — nested read
- `RoleWriteSerializer(name, description, permission_ids[])` — validate `is_system` roles can't lose `is_admin`
- `UserSerializer` — `role` → nested `RoleSerializer`
- `UserCreateSerializer` / `UserUpdateSerializer` — `role = PrimaryKeyRelatedField(Role)`
- `MeSerializer` — nested `role` + flat `permissions: [codename, ...]` (all for admin, subset otherwise)

---

## Phase 4 — Views & URLs

### `users/views.py` additions
- `AppPermissionListView` — `GET /api/permissions/` (admin only)
- `RoleListCreateView` — `GET/POST /api/roles/` (admin only)
- `RoleDetailView` — `GET/PATCH/DELETE /api/roles/{id}/` (admin; block delete on `is_system=True`)

### `users/urls.py`
Add patterns: `permissions/`, `roles/`, `roles/<int:pk>/`

### `users/admin.py`
Register `AppPermission`, `Role` with inline `permissions` M2M widget.

---

## Phase 5 — Enforce permissions in other apps

Replace existing `IsAuthenticated` / `IsAdminOrReadOnly` with `require_perm(codename)`. Use `get_permissions()` override for per-HTTP-method enforcement where needed.

| View | GET | POST | PUT/PATCH | DELETE |
|---|---|---|---|---|
| `AssetListCreateView` | `view_assets` | `create_asset` | — | — |
| `AssetDetailView` | `view_assets` | — | `edit_asset` | `delete_asset` |
| `AssetStatusHistoryView` | `view_assets` | — | — | — |
| `IncidentListCreateView` | `view_incidents` | `create_incident` | — | — |
| `IncidentDetailView` | `view_incidents` | — | `transition_incident` | — |
| `IncidentTransitionView` | — | `transition_incident` | — | — |
| `IncidentLogsView` | `view_incidents` | `comment_incident` | — | — |
| `MTTRView` | `view_analytics` | — | — | — |
| `TopFailingAssetsView` | `view_analytics` | — | — | — |
| `UptimeView` | `view_analytics` | — | — | — |
| `IncidentsBySeverityView` | `view_analytics` | — | — | — |
| `NotificationSettings*` | `manage_notifications` | — | `manage_notifications` | — |

---

## Phase 6 — Frontend types & services

### `app/types/index.ts`
```ts
export interface AppPermission {
  id: number
  codename: string
  name: string
}

export interface Role {
  id: number
  name: string
  description: string
  is_admin: boolean
  is_system: boolean
  permissions: AppPermission[]
}

// User.role changes from 'ADMIN' | 'TECHNICIAN' to:
role: Role
// MeSerializer also returns:
permissions: string[]  // flat codename list included in User from /api/auth/me/
```

### `app/lib/services/roles.ts` (new)
`getRoles()`, `getRole(id)`, `createRole(payload)`, `updateRole(id, payload)`, `deleteRole(id)`, `getPermissions()`

### `app/store/AuthContext.tsx`
- `isAdmin: user?.role?.is_admin ?? false`
- Add `permissions: string[]` from `me.permissions`
- Expose `hasPermission(codename: string): boolean` → admin always true; otherwise `permissions.includes(codename)`

---

## Phase 7 — Frontend Settings page

### Roles section (new tab/card in settings)
- List all roles with permission chip badges
- Create/Edit role dialog: name, description, permission checkboxes (fetched from `GET /api/permissions/`)
- Delete role button — disabled + tooltip for `is_system` roles

### User Create dialog update
- Role field: dropdown of existing roles
- Expandable "Define new role" section below — name + permission checkboxes
- On submit: if new role defined → `createRole()` → use returned `id` → `createUser({ ..., role: id })`

### `app/components/sidebar/AppSidebar.tsx`
Gate nav items with `hasPermission()`:
- Assets → `view_assets`
- Incidents → `view_incidents`
- Analytics → `view_analytics`
- Dashboard → always visible
- Settings → `isAdmin` (unchanged)

---

## Files to create / modify

### Backend
- `backend/users/app_permissions.py` **NEW**
- `backend/users/models.py` **MODIFY**
- `backend/users/migrations/00XX_role_models.py` **NEW** (schema, auto-generated)
- `backend/users/migrations/00XX_seed_roles.py` **NEW** (data, hand-written)
- `backend/users/permissions.py` **MODIFY**
- `backend/users/serializers.py` **MODIFY**
- `backend/users/views.py` **MODIFY**
- `backend/users/urls.py` **MODIFY**
- `backend/users/admin.py` **MODIFY**
- `backend/assets/views.py` **MODIFY**
- `backend/incidents/views.py` **MODIFY**
- `backend/analytics/views.py` **MODIFY**
- `backend/notifications/views.py` **MODIFY**

### Frontend
- `frontend/app/types/index.ts` **MODIFY**
- `frontend/app/lib/services/roles.ts` **NEW**
- `frontend/app/store/AuthContext.tsx` **MODIFY**
- `frontend/app/routes/settings.tsx` **MODIFY**
- `frontend/app/components/sidebar/AppSidebar.tsx` **MODIFY**

---

## Verification checklist

- [ ] `makemigrations && migrate` applies cleanly
- [ ] `GET /api/auth/me/` for ADMIN returns `role.is_admin: true` + all 13 codenames
- [ ] `POST /api/roles/` creates a role with `view_incidents` + `comment_incident`
- [ ] User with that role: `GET /api/assets/` → 403, `GET /api/incidents/` → 200
- [ ] Frontend: nav hides Assets/Analytics; shows only Incidents
- [ ] Admin cannot delete ADMIN system role (400)
- [ ] Deleting a role with active users → 409 (PROTECT FK)
- [ ] `hasPermission('view_assets')` returns `true` unconditionally for admin users
