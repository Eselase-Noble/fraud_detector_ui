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

/* ─────────────────────────────────────────────
   Integrations
───────────────────────────────────────────── */

export const getIntegrations = async () => {
  const { data } = await http.get<Integration[]>('/admin/integrations')
  return data
}

export const createIntegration = async (payload: {
  partner_name: string
  webhook_url: string
  notify_on: string[]
}) => {
  const { data } = await http.post('/admin/integrations', payload)
  return data
}

export const toggleIntegration = async (id: number) => {
  await http.patch(`/admin/integrations/${id}/toggle`)
}

export const deleteIntegration = async (id: number) => {
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
  const { data } = await http.post(
    `/admin/review/${transactionId}`,
    payload
  )
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
  const { data } = await http.get<AuditEntry[]>(
    '/admin/audit_log',
    { params }
  )
  return data
}

/* ─────────────────────────────────────────────
   User Risk
───────────────────────────────────────────── */

export const updateUserRisk = async (
  userId: string,
  payload: {
    risk_tier: string
    is_flagged: boolean
    notes?: string | null
  }
) => {
  const { data } = await http.patch(
    `/admin/users/${userId}/risk`,
    payload
  )
  return data
}
