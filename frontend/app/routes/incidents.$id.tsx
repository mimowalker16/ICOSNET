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
import { getUsers } from '~/lib/services/users'
import type { Incident, IncidentLog, User } from '~/types'

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
  const [comment, setComment] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [transitionError, setTransitionError] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  const { data: incident } = useQuery<Incident>({
    queryKey: ['incident', incidentId],
    queryFn: () => getIncident(incidentId),
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const transitionMut = useMutation({
    mutationFn: async ({ status, assignTo }: { status: string; assignTo?: string }) => {
      if (status === 'ASSIGNED' && assignTo) {
        await updateIncident(incidentId, { assigned_to: Number(assignTo) })
      }
      return transitionIncident(incidentId, status)
    },
    onSuccess: (updated) => {
      setTransitionError('')
      // Immediately update the cache with the returned data — no refetch lag
      queryClient.setQueryData<Incident>(['incident', incidentId], updated)
      // Also invalidate the list so the incidents table reflects the change
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Transition failed — check if this status change is allowed'
      setTransitionError(msg)
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

  function handleTransition(newStatus: string) {
    transitionMut.mutate({
      status: newStatus,
      assignTo: newStatus === 'ASSIGNED' ? assignTo : undefined,
    })
  }

  return (
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

      {allowed.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            {transitionError && (
              <Alert variant="destructive" className="w-full">
                <AlertCircle />
                <AlertDescription>{transitionError}</AlertDescription>
              </Alert>
            )}
            {allowed.includes('ASSIGNED') && (
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {allowed.map((s) => (
              <Button
                key={s}
                onClick={() => handleTransition(s)}
                disabled={transitionMut.isPending}
                variant={s === 'RESOLVED' || s === 'CLOSED' ? 'default' : 'outline'}
              >
                {s.replace('_', ' ')}
              </Button>
            ))}
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
  )
}
