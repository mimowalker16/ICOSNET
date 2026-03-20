// ─── Auth ──────────────────────────────────────────────────────────────────
export interface User {
  id: number
  username: string
  email: string
  role: 'ADMIN' | 'TECHNICIAN'
  first_name: string
  last_name: string
  is_active: boolean
}

// ─── Assets ────────────────────────────────────────────────────────────────
export type AssetType = 'SERVER' | 'ROUTER' | 'API'
export type CheckType = 'PING' | 'TCP' | 'HTTP_GET'
export type AssetStatus = 'UP' | 'DOWN' | 'DEGRADED'

export interface Asset {
  id: number
  name: string
  description: string
  ip_address_or_url: string
  asset_type: AssetType
  check_type: CheckType
  check_port: number | null
  check_interval_minutes: number
  is_active: boolean
  latest_status: AssetStatusLog | null
  created_at: string
}

export interface AssetStatusLog {
  id: number
  asset: number
  status: AssetStatus
  response_time_ms: number | null
  error_message: string
  checked_at: string
}

// ─── Incidents ─────────────────────────────────────────────────────────────
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type IncidentStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type IncidentSource = 'SYSTEM' | 'MANUAL'

export interface Incident {
  id: number
  title: string
  description: string
  asset: number | null
  asset_name?: string
  severity: Severity
  status: IncidentStatus
  source: IncidentSource
  created_by: number | null
  assigned_to: number | null
  assigned_to_name?: string
  sla_deadline: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  closed_at: string | null
  is_sla_breached: boolean
  logs?: IncidentLog[]
}

export interface IncidentLog {
  id: number
  incident: number
  actor: number | null
  actor_name?: string
  action_type: 'STATUS_CHANGE' | 'COMMENT' | 'ASSIGNMENT' | 'SYSTEM_NOTE'
  old_value: string
  new_value: string
  comment: string
  created_at: string
}

// ─── Analytics ─────────────────────────────────────────────────────────────
export interface MTTRData {
  period: string
  mttr_hours: number | null
  count: number
}

export interface TopFailingAsset {
  asset__name: string
  count: number
}

export interface UptimeData {
  asset_id: number
  asset_name: string
  uptime_percent: number
  total_checks: number
}

export interface IncidentsBySeverity {
  severity: Severity
  count: number
}

// ─── Pagination ────────────────────────────────────────────────────────────
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// ─── Notifications settings ────────────────────────────────────────────────
export interface NotificationSettings {
  id: number
  email_enabled: boolean
  slack_enabled: boolean
  teams_enabled: boolean
  slack_webhook_url: string
  teams_webhook_url: string
}
