import { useParams, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, Activity } from 'lucide-react'
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
import { getAsset, getStatusHistory } from '~/lib/services/assets'
import type { Asset, StatusLog } from '~/types'
import { RequirePermission } from '~/components/RequirePermission'

function statusVariant(status?: string) {
  switch (status) {
    case 'UP': return 'default' as const
    case 'DOWN': return 'destructive' as const
    default: return 'secondary' as const
  }
}

export default function AssetLogs() {
  const { id } = useParams()
  const assetId = Number(id)

  const { data: asset } = useQuery<Asset>({
    queryKey: ['asset', assetId],
    queryFn: () => getAsset(assetId),
  })

  const { data: logs = [], isLoading } = useQuery<StatusLog[]>({
    queryKey: ['asset-history', assetId],
    queryFn: () => getStatusHistory(assetId),
  })

  return (
    <RequirePermission permission="view_asset_logs">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/assets/${assetId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
          </Link>
          <Activity className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold flex-1">
            {asset ? `${asset.name} — Status Logs` : <Skeleton className="h-7 w-64 inline-block" />}
          </h1>
          <Badge variant="outline">{logs.length} entries</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No status logs recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Checked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {log.response_time_ms != null ? `${log.response_time_ms} ms` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                        {log.error_message || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.checked_at), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  )
}
