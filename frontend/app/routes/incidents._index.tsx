import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { getIncidents } from '~/lib/services/incidents'
import { Skeleton } from '~/components/ui/skeleton'
import { TablePagination } from '~/components/ui/table-pagination'
import type { Incident } from '~/types'

const PAGE_SIZE = 10

function severityVariant(s: string) {
  return s === 'CRITICAL' || s === 'HIGH' ? ('destructive' as const) : ('secondary' as const)
}

export default function IncidentsList() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  const { data: incidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ['incidents', search, statusFilter, severityFilter],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (severityFilter !== 'ALL') params.severity = severityFilter
      return getIncidents(params)
    },
    refetchInterval: 30_000,
  })

  const totalPages = Math.ceil(incidents.length / PAGE_SIZE)
  const paginatedIncidents = incidents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Incidents</h1>
        <Link to="/incidents/new">
          <Button>
            <Plus /> New Incident
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search incidents..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Severity</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))
            ) : incidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No incidents found</TableCell>
              </TableRow>
            ) : (
              paginatedIncidents.map((inc) => (
                <TableRow key={inc.id}>
                  <TableCell>
                    <Link to={`/incidents/${inc.id}`} className="font-medium hover:underline text-primary">{inc.title}</Link>
                  </TableCell>
                  <TableCell><Badge variant={severityVariant(inc.severity)}>{inc.severity}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{inc.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inc.asset_name || '—'}</TableCell>
                  <TableCell className="text-sm">{inc.assigned_to_username || '—'}</TableCell>
                  <TableCell>
                    {inc.is_sla_breached ? (
                      <Badge variant="destructive">Breached</Badge>
                    ) : inc.sla_deadline ? (
                      <span className="text-xs text-muted-foreground">{format(new Date(inc.sla_deadline), 'MMM d HH:mm')}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(inc.created_at), 'MMM d HH:mm')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
