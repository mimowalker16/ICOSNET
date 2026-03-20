import api from './api'
import type { MTTRData, TopFailingAsset, UptimeData, IncidentsBySeverity } from '@/types'

export const analyticsService = {
  mttr: (period = '30d') =>
    api.get<MTTRData[]>('/analytics/mttr/', { params: { period } }).then((r) => r.data),

  topFailing: (limit = 5) =>
    api.get<TopFailingAsset[]>('/analytics/top-failing/', { params: { limit } }).then((r) => r.data),

  uptime: (period = '30d') =>
    api.get<UptimeData[]>('/analytics/uptime/', { params: { period } }).then((r) => r.data),

  bySeverity: () =>
    api.get<IncidentsBySeverity[]>('/analytics/incidents-by-severity/').then((r) => r.data),
}
