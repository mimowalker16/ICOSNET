import { useQuery } from '@tanstack/react-query'
import { Server, AlertTriangle, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { assetService } from '@/services/assets'
import { incidentService } from '@/services/incidents'
import type { Asset, Incident } from '@/types'

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetService.list({ page_size: '100' }),
    refetchInterval: 30_000,
  })

  const { data: incidentsData } = useQuery({
    queryKey: ['incidents', 'dashboard'],
    queryFn: () => incidentService.list({ page_size: '50' }),
    refetchInterval: 30_000,
  })

  const assets: Asset[] = assetsData?.results ?? []
  const incidents: Incident[] = incidentsData?.results ?? []

  const down = assets.filter((a) => a.latest_status?.status === 'DOWN').length
  const up = assets.filter((a) => a.latest_status?.status === 'UP').length
  const openIncidents = incidents.filter(
    (i) => !['RESOLVED', 'CLOSED'].includes(i.status)
  ).length
  const slaBreaches = incidents.filter((i) => i.is_sla_breached).length

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Dashboard</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">
          Infrastructure overview — auto-refreshes every 30 seconds
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Assets UP"         value={up}            icon={TrendingUp}    color="bg-[var(--color-up)]" />
        <StatCard label="Assets DOWN"        value={down}          icon={Server}        color="bg-[var(--color-down)]" />
        <StatCard label="Open Incidents"     value={openIncidents} icon={AlertTriangle} color="bg-[var(--color-brand)]" />
        <StatCard label="SLA Breaches"       value={slaBreaches}   icon={Clock}         color="bg-[var(--color-high)]" />
      </div>

      {/* Asset status map */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Status Map</CardTitle>
          <span className="text-xs text-[var(--color-text-muted)]">{assets.length} monitored</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {assets.map((asset) => {
              const status = asset.latest_status?.status ?? 'UNKNOWN'
              const borderColor =
                status === 'UP'       ? 'border-[var(--color-up)]' :
                status === 'DOWN'     ? 'border-[var(--color-down)]' :
                status === 'DEGRADED' ? 'border-[var(--color-degraded)]' :
                                        'border-[var(--color-border)]'
              return (
                <div
                  key={asset.id}
                  className={`rounded-lg border-l-4 p-3 bg-[var(--color-surface-2)] ${borderColor}`}
                >
                  <p className="text-sm font-medium truncate text-[var(--color-text)]">{asset.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate mb-2">{asset.ip_address_or_url}</p>
                  {status !== 'UNKNOWN'
                    ? <Badge value={status} type="asset-status" />
                    : <span className="text-xs text-[var(--color-text-muted)]">No data</span>
                  }
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Open Incidents</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2)] border-b">
              <tr>
                {['#', 'Title', 'Severity', 'Status', 'SLA'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status)).slice(0, 10).map((inc) => (
                <tr key={inc.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">#{inc.id}</td>
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{inc.title}</td>
                  <td className="px-4 py-3"><Badge value={inc.severity} type="severity" /></td>
                  <td className="px-4 py-3"><Badge value={inc.status} type="incident-status" /></td>
                  <td className="px-4 py-3">
                    {inc.is_sla_breached
                      ? <span className="text-xs text-red-600 font-semibold">BREACHED</span>
                      : inc.sla_deadline
                        ? <span className="text-xs text-[var(--color-text-muted)]">{new Date(inc.sla_deadline).toLocaleString()}</span>
                        : '—'
                    }
                  </td>
                </tr>
              ))}
              {incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status)).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    No open incidents
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
