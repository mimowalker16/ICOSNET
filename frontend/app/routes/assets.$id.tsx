import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { getAsset, getStatusHistory } from '~/lib/services/assets'
import { getIncidents } from '~/lib/services/incidents'
import type { Asset, StatusLog, Incident } from '~/types'

function statusColor(status?: string) {
  switch (status) {
    case 'UP': return 'bg-green-600'
    case 'DOWN': return 'destructive' as const
    case 'DEGRADED': return 'bg-yellow-500 text-black'
    default: return 'outline' as const
  }
}

export default function AssetDetail() {
  const { id } = useParams()
  const assetId = Number(id)

  const { data: asset } = useQuery<Asset>({
    queryKey: ['asset', assetId],
    queryFn: () => getAsset(assetId),
  })

  const { data: history = [] } = useQuery<StatusLog[]>({
    queryKey: ['asset-history', assetId],
    queryFn: () => getStatusHistory(assetId),
  })

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ['asset-incidents', assetId],
    queryFn: () => getIncidents({ asset: String(assetId) }),
  })

  const chartData = history
    .slice()
    .reverse()
    .map((h) => ({
      time: format(new Date(h.checked_at), 'HH:mm'),
      ms: h.response_time_ms ?? 0,
    }))

  if (!asset) return <div className="p-8 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/assets">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">{asset.name}</h1>
        <Badge className={statusColor(asset.latest_status?.status)}>
          {asset.latest_status?.status ?? 'N/A'}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">IP / URL</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{asset.ip_address_or_url}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Type</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{asset.asset_type} · {asset.check_type}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Check Interval</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{asset.check_interval_minutes} min</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Response Time (last 24h)</CardTitle></CardHeader>
        <CardContent className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis unit="ms" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="ms" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">No data yet</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Linked Incidents</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No incidents</TableCell>
                </TableRow>
              ) : (
                incidents.map((inc) => (
                  <TableRow key={inc.id}>
                    <TableCell>
                      <Link to={`/incidents/${inc.id}`} className="font-medium hover:underline text-primary">{inc.title}</Link>
                    </TableCell>
                    <TableCell><Badge variant={inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? 'destructive' : 'secondary'}>{inc.severity}</Badge></TableCell>
                    <TableCell className="text-xs">{inc.status}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(inc.created_at), 'MMM d, HH:mm')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
