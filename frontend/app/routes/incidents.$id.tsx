import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, Send, AlertCircle, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { Textarea } from '~/components/ui/textarea'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { getIncident, transitionIncident, updateIncident, addIncidentComment } from '~/lib/services/incidents'
import { getUsersByPermission } from '~/lib/services/users'
import type { Incident, IncidentLog, User } from '~/types'
import { RequirePermission } from '~/components/RequirePermission'
import { useAuth } from '~/store/AuthContext'

const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS', 'NEW'],
  IN_PROGRESS: ['RESOLVED', 'ASSIGNED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
}

function severityVariant(s: string) {
  return s === 'CRITICAL' || s === 'HIGH' ? ('destructive' as const) : ('secondary' as const)
}

export default function IncidentDetail() {
  const { id } = useParams()
  const incidentId = Number(id)
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const [comment, setComment] = useState('')
  const [selectedHead, setSelectedHead] = useState('')
  const [selectedMember, setSelectedMember] = useState('')
  const [transitionError, setTransitionError] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  const { data: incident } = useQuery<Incident>({
    queryKey: ['incident', incidentId],
    queryFn: () => getIncident(incidentId),
  })

  // Users eligible to be assigned as Head (need assign_incident)
  const { data: heads = [], isFetching: headsLoading } = useQuery<User[]>({
    queryKey: ['users-by-perm', 'assign_incident'],
    queryFn: () => getUsersByPermission('assign_incident'),
    enabled: (incident?.status === 'NEW' || incident?.status === 'IN_PROGRESS') && hasPermission('assign_incident'),
  })

  // Users eligible to be escalated as Member (need transition_incident)
  const { data: members = [], isFetching: membersLoading } = useQuery<User[]>({
    queryKey: ['users-by-perm', 'transition_incident'],
    queryFn: () => getUsersByPermission('transition_incident'),
    enabled: incident?.status === 'ASSIGNED' && hasPermission('assign_incident'),
  })

  const transitionMut = useMutation({
    mutationFn: ({ newStatus, assignedTo }: { newStatus: string; assignedTo?: number }) =>
      transitionIncident(incidentId, newStatus, '', assignedTo),
    onSuccess: (updated) => {
      setTransitionError('')
      setSelectedHead('')
      setSelectedMember('')
      queryClient.setQueryData<Incident>(['incident', incidentId], updated)
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
    },
    onError: (err: unknown) => {
      const errData = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
      const msg =
        (errData as { detail?: string })?.detail ??
        (errData as { assigned_to?: string })?.assigned_to ??
        'Transition failed — check if this status change is allowed'
      setTransitionError(String(msg))
    },
  })

  const commentMut = useMutation({
    mutationFn: (text: string) => addIncidentComment(incidentId, text),
    onSuccess: (newLog: IncidentLog) => {
      setComment('')
      // Append the new log directly instead of a full refetch
      queryClient.setQueryData<Incident>(['incident', incidentId], (prev) =>
        prev ? { ...prev, logs: [...(prev.logs ?? []), newLog] } : prev
      )
    },
  })

  const editMut = useMutation({
    mutationFn: (payload: { title: string; description: string; severity: Incident['severity'] }) =>
      updateIncident(incidentId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<Incident>(['incident', incidentId], updated)
      setEditOpen(false)
    },
  })

  if (!incident) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-48" />
    </div>
  )

  const allowed = VALID_TRANSITIONS[incident.status] ?? []

  const canAssign = hasPermission('assign_incident')
  const canTransition = hasPermission('transition_incident')

  // Actions to show based on current status
  const showAssignHead = incident.status === 'NEW' && canAssign
  const showEscalateToMember = incident.status === 'ASSIGNED' && canAssign
  // Generic status buttons for non-assignment transitions (RESOLVED, CLOSED, rollbacks)
  const genericTransitions = allowed.filter(
    (s) => s !== 'ASSIGNED' && s !== 'IN_PROGRESS'
  )
  // Allow rollback to NEW from ASSIGNED (no assignee needed)
  const rollbackToNew = incident.status === 'ASSIGNED' && allowed.includes('NEW') && canTransition
  // Allow rollback from IN_PROGRESS to ASSIGNED (need assignee)
  const rollbackToAssigned = incident.status === 'IN_PROGRESS' && allowed.includes('ASSIGNED') && canAssign

  return (
    <RequirePermission permission="view_incidents">
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/incidents">
          <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1">{incident.title}</h1>
        <Badge variant={severityVariant(incident.severity)}>{incident.severity}</Badge>
        <Badge variant="outline">{incident.status}</Badge>
        {incident.is_sla_breached && <Badge variant="destructive">SLA Breached</Badge>}
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil /> Edit
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Incident</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              editMut.mutate({
                title: fd.get('title') as string,
                description: fd.get('description') as string,
                severity: fd.get('severity') as Incident['severity'],
              })
            }}
            className="space-y-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="inc-title">Title</Label>
              <Input id="inc-title" name="title" required defaultValue={incident.title} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inc-description">Description</Label>
              <Textarea
                id="inc-description"
                name="description"
                rows={3}
                defaultValue={incident.description ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label>Severity</Label>
              <Select name="severity" defaultValue={incident.severity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editMut.isError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>Failed to save changes</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={editMut.isPending}>
              {editMut.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Asset</CardTitle></CardHeader>
          <CardContent>
            {incident.asset ? (
              <Link to={`/assets/${incident.asset}`} className="text-primary hover:underline">{incident.asset_name}</Link>
            ) : '—'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Assigned To</CardTitle></CardHeader>
          <CardContent>{incident.assigned_to_username || 'Unassigned'}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">SLA Deadline</CardTitle></CardHeader>
          <CardContent>
            {incident.sla_deadline ? format(new Date(incident.sla_deadline), 'MMM d, HH:mm') : '—'}
          </CardContent>
        </Card>
      </div>

      {incident.description && (
        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{incident.description}</CardContent>
        </Card>
      )}

      {(allowed.length > 0 && (canAssign || canTransition)) && (
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {transitionError && (
              <Alert variant="destructive" className="w-full">
                <AlertCircle />
                <AlertDescription>{transitionError}</AlertDescription>
              </Alert>
            )}

            {/* NEW → ASSIGNED: assign a Head of IT */}
            {showAssignHead && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                  <Label>Assign to Team Head</Label>
                  <Select value={selectedHead} onValueChange={setSelectedHead} disabled={headsLoading}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder={headsLoading ? 'Loading...' : 'Select a head...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {heads.length === 0 ? (
                        <SelectItem value="__empty__" disabled>No eligible users found</SelectItem>
                      ) : heads.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  disabled={!selectedHead || transitionMut.isPending}
                  onClick={() => transitionMut.mutate({ newStatus: 'ASSIGNED', assignedTo: Number(selectedHead) })}
                >
                  Assign
                </Button>
              </div>
            )}

            {/* ASSIGNED → IN_PROGRESS: escalate to Member */}
            {showEscalateToMember && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                  <Label>Escalate to Member</Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember} disabled={membersLoading}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder={membersLoading ? 'Loading...' : 'Select a member...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {members.length === 0 ? (
                        <SelectItem value="__empty__" disabled>No eligible users found</SelectItem>
                      ) : members.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  disabled={!selectedMember || transitionMut.isPending}
                  onClick={() => transitionMut.mutate({ newStatus: 'IN_PROGRESS', assignedTo: Number(selectedMember) })}
                >
                  Escalate
                </Button>
              </div>
            )}

            {/* Rollback ASSIGNED → NEW */}
            {rollbackToNew && (
              <Button
                variant="outline"
                disabled={transitionMut.isPending}
                onClick={() => transitionMut.mutate({ newStatus: 'NEW' })}
              >
                Revert to New
              </Button>
            )}

            {/* Rollback IN_PROGRESS → ASSIGNED */}
            {rollbackToAssigned && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                  <Label>Re-assign Head</Label>
                  <Select value={selectedHead} onValueChange={setSelectedHead} disabled={headsLoading}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder={headsLoading ? 'Loading...' : 'Select a head...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {heads.length === 0 ? (
                        <SelectItem value="__empty__" disabled>No eligible users found</SelectItem>
                      ) : heads.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  disabled={!selectedHead || transitionMut.isPending}
                  onClick={() => transitionMut.mutate({ newStatus: 'ASSIGNED', assignedTo: Number(selectedHead) })}
                >
                  Re-assign
                </Button>
              </div>
            )}

            {/* Generic transitions: RESOLVED, CLOSED (and IN_PROGRESS → RESOLVED) */}
            {genericTransitions.length > 0 && canTransition && (
              <div className="flex flex-wrap gap-2">
                {genericTransitions.map((s) => (
                  <Button
                    key={s}
                    onClick={() => transitionMut.mutate({ newStatus: s })}
                    disabled={transitionMut.isPending}
                    variant={s === 'RESOLVED' || s === 'CLOSED' ? 'default' : 'outline'}
                  >
                    {s.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {incident.logs && incident.logs.length > 0 ? (
            incident.logs.map((log) => (
              <div key={log.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
                  <div className="flex-1 w-px bg-border" />
                </div>
                <div className="pb-4">
                  <div className="text-sm font-medium">
                    {log.action_type === 'COMMENT' ? 'Comment' : log.action_type.replace('_', ' ')}
                    {log.actor_username && <span className="text-muted-foreground"> by {log.actor_username}</span>}
                  </div>
                  {log.action_type === 'STATUS_CHANGE' && (
                    <p className="text-sm text-muted-foreground">{log.old_value} → {log.new_value}</p>
                  )}
                  {log.comment && <p className="text-sm mt-1">{log.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(log.created_at), 'MMM d, HH:mm')}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          )}

          <Separator />

          <div className="flex gap-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="flex-1"
            />
            <Button
              size="icon"
              disabled={!comment.trim() || commentMut.isPending}
              onClick={() => commentMut.mutate(comment.trim())}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </RequirePermission>
  )
}
