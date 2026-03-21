import client from '~/lib/client'
import type { AnalyticsMTTR, TopFailing, UptimeEntry, SeverityCount } from '~/types'

export async function getMTTR() {
  const { data } = await client.get<AnalyticsMTTR>('analytics/mttr/')
  return data
}

export async function getTopFailing() {
  const { data } = await client.get<TopFailing[]>('analytics/top-failing/')
  return data
}

export async function getUptime() {
  const { data } = await client.get<UptimeEntry[]>('analytics/uptime/')
  return data
}

export async function getIncidentsBySeverity() {
  const { data } = await client.get<SeverityCount[]>('analytics/incidents-by-severity/')
  return data
}
