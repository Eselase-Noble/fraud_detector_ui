// Partner-facing types — the institution's own view of its Sentinel integration.

export type InstitutionType =
  | 'bank' | 'fintech' | 'psp' | 'microfinance' | 'mobile_money' | 'sacco' | 'exchange' | 'other'
export type ConnectionMethod = 'rest_api' | 'batch_api' | 'database' | 'file_sftp'

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

export interface PortalProfile {
  integration: Integration
  usage: { scored: number; blocked: number; reviewed: number }
}

export interface FraudResult {
  transaction_id: string
  score: number
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK'
  reason: string
  signals: string[]
  processed_at: string
}
