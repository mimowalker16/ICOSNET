# Plan: Auto-assignment on Incident Creation

Everything already built (StatusRoleMapping, transition validation, eligible assignees, settings UI, dynamic dropdown) supports your workflow. The only missing piece is **auto-assignment when an incident is created**.

## Steps

1. **Modify `IncidentCreateSerializer.create()`** in `backend/incidents/serializers.py` (lines 45-59)
   - If `source == MANUAL` → force `assigned_to = request.user` (creator is the initial handler)
   - If `source == SYSTEM` → force `assigned_to = None` (unassigned; admins claim it from the list)
   - This overrides whatever the frontend sends for `assigned_to`, enforcing the rule server-side

2. **No frontend changes needed** — the creation form at `frontend/app/routes/incidents.new.tsx` already doesn't send `assigned_to`; the backend will auto-fill it

**No other changes.** The rest of the workflow is already handled:
- StatusRoleMapping CRUD + Settings UI → admin configures `ASSIGNED → Head role`, `IN_PROGRESS → Member role`
- `IncidentTransitionView` → validates assignee role against the mapping on transition
- `EligibleAssigneesView` → filters users by mapped role
- Incident detail page → shows dynamic assignee dropdown filtered by role

## Example Configured Flow

```
StatusRoleMappings:  ASSIGNED → "Head of IT"  |  IN_PROGRESS → "Technician"

1. SYSTEM incident created → assigned_to=null, status=NEW → admins see it
2. Admin transitions NEW→ASSIGNED, picks a Head user → dropdown shows only Head-role users
3. Head transitions ASSIGNED→IN_PROGRESS, picks a Technician → dropdown shows only Technicians
4. Technician resolves (IN_PROGRESS→RESOLVED)
5. Closed (RESOLVED→CLOSED)

MANUAL incident: same chain but assigned_to=creator from creation
```

## Relevant Files

- `backend/incidents/serializers.py` — `IncidentCreateSerializer.create()` (the only code change)

## Verification

1. `POST /api/incidents/` with `source=SYSTEM` → response has `assigned_to: null`
2. `POST /api/incidents/` with `source=MANUAL` → response has `assigned_to: <creator_id>`
3. Transition chain with StatusRoleMappings still works (ASSIGNED→Head, IN_PROGRESS→Member)
4. `python manage.py check` passes, zero TS errors
