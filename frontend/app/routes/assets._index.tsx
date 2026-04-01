import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Plus, Search } from 'lucide-react'
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
import { getAssets } from '~/lib/services/assets'
import { Skeleton } from '~/components/ui/skeleton'
import { TablePagination } from '~/components/ui/table-pagination'
import type { Asset } from '~/types'

const PAGE_SIZE = 10

function statusBadge(status?: string) {
  switch (status) {
    case 'UP': return <Badge className="bg-green-600">UP</Badge>
    case 'DOWN': return <Badge variant="destructive">DOWN</Badge>
    case 'DEGRADED': return <Badge className="bg-yellow-500 text-black">DEGRADED</Badge>
    default: return <Badge variant="outline">N/A</Badge>
  }
}

export default function AssetsList() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['assets', search, typeFilter],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (typeFilter !== 'ALL') params.asset_type = typeFilter
      return getAssets(params)
    },
  })

  const totalPages = Math.ceil(assets.length / PAGE_SIZE)
  const paginatedAssets = assets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assets</h1>
        <Link to="/assets/new">
          <Button>
            <Plus /> Add Asset
          </Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="SERVER">Server</SelectItem>
            <SelectItem value="ROUTER">Router</SelectItem>
            <SelectItem value="API">API</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>IP / URL</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Check</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Response</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))
            ) : assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No assets found
                </TableCell>
              </TableRow>
            ) : (
              paginatedAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <Link to={`/assets/${asset.id}`} className="font-medium hover:underline text-primary">
                      {asset.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{asset.ip_address_or_url}</TableCell>
                  <TableCell><Badge variant="outline">{asset.asset_type}</Badge></TableCell>
                  <TableCell className="text-xs">{asset.check_type}</TableCell>
                  <TableCell>{statusBadge(asset.latest_status?.status)}</TableCell>
                  <TableCell className="text-sm">
                    {asset.latest_status?.response_time_ms != null
                      ? `${asset.latest_status.response_time_ms}ms`
                      : '—'}
                  </TableCell>
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
