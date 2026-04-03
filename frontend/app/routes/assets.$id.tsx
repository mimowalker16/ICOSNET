import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router'
import { format } from 'date-fns'
import { ArrowLeft, Pencil, Trash2, AlertCircle, Activity } from 'lucide-react'
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
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { getAsset, getStatusHistory, updateAsset, deleteAsset } from '~/lib/services/assets'
import { getIncidents } from '~/lib/services/incidents'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { TablePagination } from '~/components/ui/table-pagination'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import type { Asset, StatusLog, Incident } from '~/types'
import { RequirePermission } from '~/components/RequirePermission'
import { useAuth } from '~/store/AuthContext'

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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [incPage, setIncPage] = useState(1)
  const INC_PAGE_SIZE = 5

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

  const editMut = useMutation({
    mutationFn: (payload: Partial<Asset>) => updateAsset(assetId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<Asset>(['asset', assetId], updated)
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      setEditOpen(false)
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      navigate('/assets')
    },
  })

  const incTotalPages = Math.ceil(incidents.length / INC_PAGE_SIZE)
  const paginatedIncidents = incidents.slice((incPage - 1) * INC_PAGE_SIZE, incPage * INC_PAGE_SIZE)

  const chartData = history
    .slice()
    .reverse()
    .map((h) => ({
      time: format(new Date(h.checked_at), 'HH:mm'),
      ms: h.response_time_ms ?? 0,
    }))

  if (!asset) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const port = fd.get('check_port') as string
    editMut.mutate({
      name: fd.get('name') as string,
      ip_address_or_url: fd.get('ip_address_or_url') as string,
      asset_type: fd.get('asset_type') as Asset['asset_type'],
      check_type: fd.get('check_type') as Asset['check_type'],
      check_port: port ? Number(port) : null,
      check_interval_minutes: Number(fd.get('check_interval_minutes')),
      description: fd.get('description') as string,
      is_active: fd.get('is_active') === 'true',
    })
  }

  return (
    <RequirePermission permission="view_assets">
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/assets">
          <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1">{asset.name}</h1>
        <Badge className={statusColor(asset.latest_status?.status)}>
          {asset.latest_status?.status ?? 'N/A'}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 /> Delete
        </Button>
        {hasPermission('view_asset_logs') && (
          <Link to={`/assets/${assetId}/logs`}>
            <Button variant="outline" size="sm"><Activity /> Logs</Button>
          </Link>
        )}
      </div>

      {/* Edit Drawer — slides up from bottom */}
      <Drawer open={editOpen} onOpenChange={setEditOpen} direction="bottom">
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Edit Asset</DrawerTitle>
          </DrawerHeader>
          <form onSubmit={handleEdit} className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required defaultValue={asset.name} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ip_address_or_url">IP / URL</Label>
              <Input id="ip_address_or_url" name="ip_address_or_url" required defaultValue={asset.ip_address_or_url} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Asset Type</Label>
                <Select name="asset_type" defaultValue={asset.asset_type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVER">Server</SelectItem>
                    <SelectItem value="ROUTER">Router</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Check Type</Label>
                <Select name="check_type" defaultValue={asset.check_type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PING">PING</SelectItem>
                    <SelectItem value="TCP">TCP</SelectItem>
                    <SelectItem value="HTTP_GET">HTTP GET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="check_port">Check Port</Label>
                <Input id="check_port" name="check_port" type="number" defaultValue={asset.check_port ?? ''} placeholder="Optional" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="check_interval_minutes">Interval (min)</Label>
                <Input id="check_interval_minutes" name="check_interval_minutes" type="number" required defaultValue={asset.check_interval_minutes} min={1} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" defaultValue={asset.description ?? ''} />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select name="is_active" defaultValue={String(asset.is_active)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
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
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Asset</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{asset.name}</strong>? This action cannot be undone.
          </p>
          {deleteMut.isError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>Failed to delete asset</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate()}>
              {deleteMut.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
        <CardHeader><CardTitle>Incident history</CardTitle></CardHeader>
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
                paginatedIncidents.map((inc) => (
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
          <TablePagination page={incPage} totalPages={incTotalPages} onPageChange={setIncPage} />
        </CardContent>
      </Card>
    </div>
    </RequirePermission>
  )
}
