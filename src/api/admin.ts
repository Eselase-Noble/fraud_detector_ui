// /src/api/admin.ts
import { http } from '@/api/http'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface Integration {
  id: number
  partner_name: string
  webhook_url: string
  is_active: boolean
  notify_on: string[]
  created_at: string
  last_used_at: string | null
  api_key?: string
}

export interface AuditEntry {
  id: number
  transaction_id: string
  analyst_id: string | null
  action: string
  previous_decision: string | null
  new_decision: string | null
  note: string | null
  created_at: string
}

export type RiskTier = 'standard' | 'elevated' | 'high'

/* ─────────────────────────────────────────────
   Integrations
───────────────────────────────────────────── */

export const getIntegrations = async (): Promise<Integration[]> => {
  const { data } = await http.get<Integration[]>('/admin/integrations')
  return data
}

export const createIntegration = async (payload: {
  partner_name: string
  webhook_url: string
  notify_on: string[]
}): Promise<Integration> => {
  const { data } = await http.post<Integration>('/admin/integrations', payload)
  return data
}

export const toggleIntegration = async (id: number): Promise<void> => {
  await http.patch(`/admin/integrations/${id}/toggle`)
}

export const deleteIntegration = async (id: number): Promise<void> => {
  await http.delete(`/admin/integrations/${id}`)
}

/* ─────────────────────────────────────────────
   Case Review
───────────────────────────────────────────── */

export const submitCaseReview = async (
  transactionId: string,
  payload: {
    analyst_id: string
    action: string
    new_decision?: string
    note?: string | null
  }
) => {
  const { data } = await http.post(`/admin/review/${transactionId}`, payload)
  return data
}

/* ─────────────────────────────────────────────
   Audit Log
───────────────────────────────────────────── */

export const getAuditLog = async (params: {
  transaction_id?: string
  analyst_id?: string
  limit: number
  offset: number
}) => {
  // Only send optional filters if they have a non-empty value —
  // sending transaction_id='' would filter to zero results on the backend
  const query: Record<string, string | number> = {
    limit: params.limit,
    offset: params.offset,
  }
  if (params.transaction_id?.trim()) query.transaction_id = params.transaction_id.trim()
  if (params.analyst_id?.trim())     query.analyst_id     = params.analyst_id.trim()

  const { data } = await http.get<AuditEntry[]>('/admin/audit_log', { params: query })
  return data
}

/* ─────────────────────────────────────────────
   User Risk
───────────────────────────────────────────── */

export const updateUserRisk = async (
  userId: string,
  payload: {
    risk_tier: RiskTier
    is_flagged: boolean
    notes?: string | null
  }
) => {
  const { data } = await http.patch(`/admin/users/${userId}/risk`, payload)
  return data
}
