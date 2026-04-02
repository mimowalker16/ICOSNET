import client from '~/lib/client'
import type { Incident, IncidentLog, StatusRoleMapping, EligibleAssignee } from '~/types'

export async function getIncidents(params?: Record<string, string>) {
  const { data } = await client.get<{ count: number; results: Incident[] } | Incident[]>('incidents/', { params })
  return Array.isArray(data) ? data : data.results
}

export async function getIncident(id: number) {
  const { data } = await client.get<Incident>(`incidents/${id}/`)
  return data
}

export async function createIncident(payload: {
  title: string
  description?: string
  asset?: number
  severity: string
  source?: string
  assigned_to?: number
}) {
  const { data } = await client.post<Incident>('incidents/', { source: 'MANUAL', ...payload })
  return data
}

export async function updateIncident(id: number, payload: Partial<Incident>) {
  const { data } = await client.patch<Incident>(`incidents/${id}/`, payload)
  return data
}

export async function transitionIncident(id: number, status: string, comment?: string, assigned_to?: number) {
  const { data } = await client.post<Incident>(`incidents/${id}/transition/`, {
    new_status: status,
    comment,
    ...(assigned_to !== undefined ? { assigned_to } : {}),
  })
  return data
}

export async function getIncidentLogs(id: number) {
  const { data } = await client.get<{ count: number; results: IncidentLog[] } | IncidentLog[]>(`incidents/${id}/logs/`)
  return Array.isArray(data) ? data : data.results
}

export async function addIncidentComment(id: number, comment: string) {
  const { data } = await client.post<IncidentLog>(`incidents/${id}/logs/`, { comment })
  return data
}

export async function getStatusRoleMappings() {
  const { data } = await client.get<StatusRoleMapping[]>('incidents/status-role-mappings/')
  return data
}

export async function createStatusRoleMapping(payload: { status: string; role: number }) {
  const { data } = await client.post<StatusRoleMapping>('incidents/status-role-mappings/', payload)
  return data
}

export async function deleteStatusRoleMapping(id: number) {
  await client.delete(`incidents/status-role-mappings/${id}/`)
}

export async function getEligibleAssignees(status: string) {
  const { data } = await client.get<EligibleAssignee[]>('incidents/eligible-assignees/', { params: { status } })
  return data
}
