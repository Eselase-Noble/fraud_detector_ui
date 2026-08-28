import { http } from '@/portal/http'
import { setToken } from '@/portal/auth'
import type {
  Integration, PortalProfile, FraudResult, TxnRow, PartnerUser, DashboardSummary,
} from '@/portal/types'

interface LoginResponse { token: string; profile: PortalProfile }

// ── Auth ──
export const login = async (email: string, password: string): Promise<PortalProfile> => {
  const { data } = await http.post<LoginResponse>('/portal/login', { email, password })
  setToken(data.token)
  return data.profile
}
export const getSession = async (): Promise<PortalProfile> => {
  const { data } = await http.post<PortalProfile>('/portal/session')
  return data
}

// ── Settings ──
export const updateConfig = async (
  payload: { webhook_url?: string; notify_on?: string[] },
): Promise<Integration> => {
  const { data } = await http.patch<Integration>('/portal/config', payload)
  return data
}

// ── Transactions / analytics / detect (all tenant-scoped) ──
export const listTransactions = async (
  params: { decision?: string; search?: string; limit?: number } = {},
): Promise<TxnRow[]> => {
  const { data } = await http.get<TxnRow[]>('/portal/transactions', { params })
  return data
}
export const getAnalytics = async (days = 30): Promise<DashboardSummary> => {
  const { data } = await http.get<DashboardSummary>('/portal/analytics', { params: { days } })
  return data
}
export const detect = async (txn: Record<string, unknown>): Promise<FraudResult> => {
  const { data } = await http.post<FraudResult>('/portal/detect', txn)
  return data
}

// ── Team (partner users) ──
export const listUsers = async (): Promise<PartnerUser[]> => {
  const { data } = await http.get<PartnerUser[]>('/portal/users')
  return data
}
export const createUser = async (payload: {
  email: string; password: string; name?: string; role?: string
}): Promise<PartnerUser> => {
  const { data } = await http.post<PartnerUser>('/portal/users', payload)
  return data
}
export const updateUser = async (
  id: number, payload: { name?: string; role?: string; is_active?: boolean; password?: string },
): Promise<PartnerUser> => {
  const { data } = await http.patch<PartnerUser>(`/portal/users/${id}`, payload)
  return data
}
export const deleteUser = async (id: number): Promise<void> => {
  await http.delete(`/portal/users/${id}`)
}
