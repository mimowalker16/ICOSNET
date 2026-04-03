# Plan: Incident Lifecycle Redesign

## The Assignment Chain

> System created → admin pool (broadcast, assigned_to=null) → Admin assigns to Head → Head escalates to Member → Member resolves → anyone with transition_incident closes

---

## Decisions

- System incidents: `assigned_to = null`, ALL admin users get broadcast notification (via `role__is_admin=True`)
- Manual incidents: `assigned_to = creator` on creation — not settable by the client
- `ASSIGNED → IN_PROGRESS`: Head triggers by assigning a Member (updates `assigned_to` + transitions status simultaneously)
- Assignee validation: `→ ASSIGNED` assignee needs `assign_incident`; `→ IN_PROGRESS` assignee needs `transition_incident`
- Who can close: any role with `transition_incident`
- `StatusRoleMapping`: remove entirely (drop table, clean serializers)

---

## Phase 1 — Fix broken server (no dependencies, do first)

1. **`incidents/serializers.py`** — Remove the `StatusRoleMapping` import and its two orphaned serializer classes (`StatusRoleMappingSerializer`, `StatusRoleMappingWriteSerializer`). The Python class was never added to `models.py`, causing an import crash.

2. **`incidents/migrations/0004_remove_statusrolemapping.py`** — New migration: `migrations.DeleteModel(name='StatusRoleMapping')` to drop the orphaned `status_role_mappings` DB table created by migration 0003.

3. **`notifications/service.py`** — Fix `User.objects.filter(role='ADMIN', ...)` → `User.objects.filter(role__is_admin=True, ...)`. Broken since the role CharField was replaced with a FK.

---

## Phase 2 — Backend lifecycle

4. **`incidents/models.py` — `transition_to()`** — Accept `new_assigned_to=None` param; set `self.assigned_to = new_assigned_to` when provided before saving; create an ASSIGNMENT `IncidentLog` entry when assignee changes; clear `assigned_to = None` on rollback to NEW.

5. **`incidents/serializers.py` — `IncidentCreateSerializer`** — Remove `assigned_to` from writable fields. Auto-set on `create()`:
   - `source == MANUAL` → `assigned_to = request.user`
   - `source == SYSTEM` → `assigned_to = None`

6. **`incidents/serializers.py` — `TransitionSerializer`** — Add cross-field validation: `assigned_to` is **required** when `new_status` is `ASSIGNED` or `IN_PROGRESS`.

7. **`incidents/views.py` — `IncidentTransitionView.post()`** — Resolve `assigned_to` user from ID; validate their role permissions before calling `transition_to()`:
   - `→ ASSIGNED`: assignee must have `assign_incident` codename → 400 if not
   - `→ IN_PROGRESS`: assignee must have `transition_incident` codename → 400 if not
   - Pass `new_assigned_to` to `transition_to()`

8. **`users/views.py`** — Add `?permission=<codename>` queryset filter to `UserListView` via `role__permissions__codename`.

---

## Phase 3 — Frontend

9. **`lib/services/users.ts`** — Add `getUsersByPermission(codename: string)` helper that calls `GET /api/users/?permission=<codename>`.

10. **`routes/incidents.$id.tsx`** — Replace generic status dropdown for ASSIGNED/IN_PROGRESS transitions with contextual assignment UX:
    - NEW + `hasPermission('assign_incident')` → "Assign to Team Head" pane with user picker (users from `getUsersByPermission('assign_incident')`)
    - ASSIGNED + `hasPermission('assign_incident')` → "Escalate to Member" pane with user picker (users from `getUsersByPermission('transition_incident')`)
    - Both submit via `POST /api/incidents/<id>/transition/` with `{ new_status, assigned_to }`

---

## Relevant Files

| File | Change |
|---|---|
| `backend/incidents/models.py` | Update `transition_to()` |
| `backend/incidents/serializers.py` | Remove StatusRoleMapping; update Create + Transition serializers |
| `backend/incidents/views.py` | Validate assignee perms in `IncidentTransitionView` |
| `backend/incidents/migrations/0004_remove_statusrolemapping.py` | New — drop table |
| `backend/notifications/service.py` | Fix `role='ADMIN'` → `role__is_admin=True` |
| `backend/users/views.py` | Add `?permission=` filter |
| `frontend/app/routes/incidents.$id.tsx` | Contextual assignment UI |
| `frontend/app/lib/services/users.ts` | Add `getUsersByPermission()` |

---

## Verification Checklist

- [ ] `python manage.py migrate` — no errors, StatusRoleMapping table dropped
- [ ] `python manage.py check` — no import errors
- [ ] `POST /api/incidents/<id>/transition/ {new_status: ASSIGNED, assigned_to: <user_without_assign_perm>}` → 400
- [ ] Same with valid Head user (has `assign_incident`) → 200, status=ASSIGNED, correct `assigned_to`
- [ ] `POST ... {new_status: IN_PROGRESS, assigned_to: <valid_member>}` → 200, both status and `assigned_to` updated
- [ ] System probe creates incident: `assigned_to=null`, email query uses `role__is_admin=True`
- [ ] Manual creation: `assigned_to` = creator, client cannot override it
- [ ] HEAD assigning to Member: `assigned_to` in response reflects member

---

## Out of Scope (for now)

- Creating the actual Head / Member roles (to be created manually later via Settings → Roles)
- Team membership grouping / org-chart relationships
