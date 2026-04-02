export interface AppPermission {
  id: number
  codename: string
  name: string
}

export interface Role {
  id: number
  name: string
  description: string
  is_admin: boolean
  is_system: boolean
  permissions: AppPermission[]
  created_at: string
}

export interface User {
  id: number
  username: string
  email: string
  role: Role
  first_name: string
  last_name: string
  is_active: boolean
  date_joined: string
}

export interface MeUser extends User {
  permissions: string[]
}

export interface Asset {
  id: number
  name: string
  description: string
  ip_address_or_url: string
  asset_type: 'SERVER' | 'ROUTER' | 'API'
  check_type: 'PING' | 'TCP' | 'HTTP_GET'
  check_port: number | null
  check_interval_minutes: number
  is_active: boolean
  created_by: number
  created_by_username: string
  created_at: string
  updated_at: string
  latest_status: StatusLog | null
}

export interface StatusLog {
  id: number
  status: 'UP' | 'DOWN' | 'DEGRADED'
  response_time_ms: number | null
  error_message: string
  checked_at: string
}

export interface Incident {
  id: number
  title: string
  description?: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  source: 'SYSTEM' | 'MANUAL'
  asset: number | null
  asset_name: string
  assigned_to: number | null
  assigned_to_username: string
  created_by: number | null
  created_by_username: string
  sla_deadline: string | null
  is_sla_breached: boolean
  created_at: string
  updated_at: string
  resolved_at: string | null
  closed_at?: string | null
  logs?: IncidentLog[]
}

export interface IncidentLog {
  id: number
  incident: number
  actor: number | null
  actor_username: string
  action_type: 'STATUS_CHANGE' | 'COMMENT' | 'ASSIGNMENT' | 'SYSTEM_NOTE'
  old_value: string | null
  new_value: string | null
  comment: string | null
  created_at: string
}

export interface AnalyticsMTTR {
  period: string
  mttr_hours: number
  total_resolved: number
}

export interface TopFailing {
  asset__id: number
  asset__name: string
  incident_count: number
}

export interface NotificationSettings {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  from_email: string
  slack_webhook_url: string
  teams_webhook_url: string
  updated_at: string
}

export interface UptimeEntry {
  asset_id: number
  asset_name: string
  asset_type: string
  total_checks: number
  up_checks: number
  uptime_pct: number | null
}

export interface SeverityCount {
  severity: string
  count: number
}
