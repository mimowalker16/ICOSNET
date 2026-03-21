import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { getMTTR, getTopFailing, getUptime, getIncidentsBySeverity } from '~/lib/services/analytics'

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
}

export default function Analytics() {
  const { data: mttr } = useQuery({ queryKey: ['analytics-mttr'], queryFn: getMTTR })
  const { data: topFailing = [] } = useQuery({ queryKey: ['analytics-top-failing'], queryFn: getTopFailing })
  const { data: uptime = [] } = useQuery({ queryKey: ['analytics-uptime'], queryFn: getUptime })
  const { data: severity = [] } = useQuery({ queryKey: ['analytics-severity'], queryFn: getIncidentsBySeverity })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Mean Time to Resolve</CardTitle></CardHeader>
          <CardContent>
            {mttr ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-bold tabular-nums">{mttr.mttr_hours.toFixed(1)}</span>
                  <span className="text-muted-foreground mb-1">hours avg</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Based on <span className="font-medium text-foreground">{mttr.total_resolved}</span> resolved incidents &mdash; period: {mttr.period}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-68 text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Incidents by Severity</CardTitle></CardHeader>
          <CardContent>
            {severity.length > 0 ? (
              <ResponsiveContainer width="100%" height={272}>
                <PieChart>
                  <Pie
                    data={severity}
                    dataKey="count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name ?? ''}: ${value}`}
                  >
                    {severity.map((entry) => (
                      <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Failing Assets</CardTitle></CardHeader>
          <CardContent>
            {topFailing.length > 0 ? (
              <ResponsiveContainer width="100%" height={272}>
                <BarChart data={topFailing} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="asset__name" type="category" tick={{ fontSize: 12 }} width={120} />
                  <Tooltip formatter={(value) => [`${value} failures`, 'Count']} />
                  <Bar dataKey="incident_count" fill="#dc2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Asset Uptime %</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Uptime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uptime.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">No data yet</TableCell>
                  </TableRow>
                ) : (
                  uptime.map((entry) => (
                    <TableRow key={entry.asset_id}>
                      <TableCell className="font-medium">{entry.asset_name}</TableCell>
                      <TableCell className="text-right">
                        <span className={!entry.uptime_pct ? 'text-muted-foreground' : entry.uptime_pct >= 99 ? 'text-green-600' : entry.uptime_pct >= 95 ? 'text-yellow-600' : 'text-red-600'}>
                          {entry.uptime_pct != null ? `${entry.uptime_pct.toFixed(1)}%` : 'N/A'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
