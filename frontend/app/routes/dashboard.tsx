import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Server, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { getAssets } from '~/lib/services/assets'
import { getIncidents } from '~/lib/services/incidents'
import type { Asset, Incident } from '~/types'

function statusColor(status: string) {
  switch (status) {
    case 'UP': return 'bg-green-500'
    case 'DOWN': return 'bg-red-500'
    case 'DEGRADED': return 'bg-yellow-500'
    default: return 'bg-gray-400'
  }
}

function severityVariant(severity: string) {
  switch (severity) {
    case 'CRITICAL': return 'destructive' as const
    case 'HIGH': return 'destructive' as const
    case 'MEDIUM': return 'secondary' as const
    default: return 'outline' as const
  }
}

export default function Dashboard() {
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: () => getAssets(),
    refetchInterval: 30_000,
  })

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ['incidents'],
    queryFn: () => getIncidents(),
    refetchInterval: 30_000,
  })

  const upCount = assets.filter((a) => a.latest_status?.status === 'UP').length
  const openIncidents = incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status))
  const breachedCount = openIncidents.filter((i) => i.is_sla_breached).length
  const upPercent = assets.length ? Math.round((upCount / assets.length) * 100) : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upPercent}%</div>
            <p className="text-xs text-muted-foreground">{upCount} of {assets.length} assets UP</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openIncidents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SLA Breached</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{breachedCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {assets.slice(0, 8).map((asset) => (
                <Link
                  key={asset.id}
                  to={`/assets/${asset.id}`}
                  className="flex items-center gap-2 rounded-md border p-3 hover:bg-accent transition-colors"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${statusColor(asset.latest_status?.status ?? '')}`} />
                  <span className="truncate text-sm font-medium">{asset.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{asset.asset_type}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.slice(0, 6).map((inc) => (
                  <TableRow key={inc.id}>
                    <TableCell>
                      <Link to={`/incidents/${inc.id}`} className="font-medium hover:underline">
                        {inc.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={severityVariant(inc.severity)}>{inc.severity}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{inc.status}</TableCell>
                  </TableRow>
                ))}
                {incidents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No incidents
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
