import api from './api'
import type { Incident, IncidentLog, Paginated } from '@/types'

export const incidentService = {
  list: (params?: Record<string, string>) =>
    api.get<Paginated<Incident>>('/incidents/', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<Incident>(`/incidents/${id}/`).then((r) => r.data),

  create: (data: Partial<Incident>) =>
    api.post<Incident>('/incidents/', data).then((r) => r.data),

  update: (id: number, data: Partial<Incident>) =>
    api.patch<Incident>(`/incidents/${id}/`, data).then((r) => r.data),

  transition: (id: number, new_status: string) =>
    api.post<Incident>(`/incidents/${id}/transition/`, { new_status }).then((r) => r.data),

  logs: (id: number) =>
    api.get<Paginated<IncidentLog>>(`/incidents/${id}/logs/`).then((r) => r.data),

  addComment: (id: number, comment: string) =>
    api.post<IncidentLog>(`/incidents/${id}/logs/`, { comment }).then((r) => r.data),
}
