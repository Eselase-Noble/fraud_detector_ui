// Partner-facing types — the institution's own view of its Sentinel integration.

export type InstitutionType =
  | 'bank' | 'fintech' | 'psp' | 'microfinance' | 'mobile_money' | 'sacco' | 'exchange' | 'other'
export type ConnectionMethod = 'rest_api' | 'batch_api' | 'database' | 'file_sftp'
export type PartnerRole = 'admin' | 'analyst' | 'viewer'

export interface Integration {
  id: number
  partner_name: string
  webhook_url: string
  is_active: boolean
  notify_on: string[]
  institution_type: InstitutionType
  connection_method: ConnectionMethod
  contact_email: string | null
  portal_email: string | null
  created_at: string
  last_used_at: string | null
  api_key?: string
}

export interface PartnerUser {
  id: number
  integration_id: number
  email: string
  name: string | null
  role: PartnerRole
  is_active: boolean
  created_at: string
}

export interface Usage {
  scored: number
  blocked: number
  reviewed: number
  allowed: number
  flagged_amount: number
}

export interface PortalProfile {
  integration: Integration
  user: PartnerUser | null
  usage: Usage
}

export interface FraudResult {
  transaction_id: string
  score: number
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK'
  reason: string
  signals: string[]
  processed_at: string
}

export interface TxnRow {
  transaction_id: string
  user_id: string
  amount: number
  currency: string
  location: string | null
  merchant_category: string | null
  timestamp: string
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK' | null
  score: number | null
  reason: string | null
  signals: string[]
}

// Analytics (mirror of Sentinel's DashboardSummary, scoped to the partner)
export interface FraudStats {
  total_transactions: number; blocked: number; reviewed: number; allowed: number
  fraud_rate: number; review_rate: number; total_flagged_amount: number; avg_flagged_amount: number
}
export interface TimeSeries { date: string; total: number; blocked: number; reviewed: number; allowed: number; total_amount: number }
export interface TopUser { user_id: string; transaction_count: number; blocked_count: number; total_amount: number; risk_score: number }
export interface LocationRisk { location: string; transaction_count: number; blocked_count: number; total_amount: number; risk_score: number }
export interface SignalFrequency { signal: string; count: number; pct: number }
export interface DashboardSummary {
  stats: FraudStats
  recent_timeseries: TimeSeries[]
  top_risky_users: TopUser[]
  location_breakdown: LocationRisk[]
  signal_frequency: SignalFrequency[]
}
