import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, ScrollText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { TablePagination } from '~/components/ui/table-pagination'
import { getIncident, getIncidentLogs } from '~/lib/services/incidents'
import type { Incident, IncidentLog } from '~/types'
import { RequirePermission } from '~/components/RequirePermission'

const PAGE_SIZE = 25

const ACTION_LABELS: Record<string, string> = {
  STATUS_CHANGE: 'Status Change',
  COMMENT: 'Comment',
  ASSIGNMENT: 'Assignment',
  SYSTEM_NOTE: 'System Note',
}

function actionVariant(type: string) {
  switch (type) {
    case 'STATUS_CHANGE': return 'default' as const
    case 'COMMENT': return 'secondary' as const
    case 'ASSIGNMENT': return 'outline' as const
    default: return 'secondary' as const
  }
}

export default function IncidentLogs() {
  const { id } = useParams()
  const incidentId = Number(id)
  const [page, setPage] = useState(1)

  const { data: incident } = useQuery<Incident>({
    queryKey: ['incident', incidentId],
    queryFn: () => getIncident(incidentId),
  })

  const { data: logs = [], isLoading } = useQuery<IncidentLog[]>({
    queryKey: ['incident-logs', incidentId],
    queryFn: () => getIncidentLogs(incidentId),
  })

  const totalPages = Math.ceil(logs.length / PAGE_SIZE)
  const paginated = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <RequirePermission permission="view_incident_logs">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/incidents/${incidentId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
          </Link>
          <ScrollText className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold flex-1">
            {incident ? `#${incident.id} — Activity Logs` : <Skeleton className="h-7 w-64 inline-block" />}
          </h1>
          <Badge variant="outline">{logs.length} entries</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant={actionVariant(log.action_type)}>
                          {ACTION_LABELS[log.action_type] ?? log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.actor_username || <span className="text-muted-foreground">System</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.old_value && log.new_value
                          ? `${log.old_value} → ${log.new_value}`
                          : log.new_value || log.old_value || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.comment || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  )
}
