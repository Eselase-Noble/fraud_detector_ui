import { http } from '@/portal/http'
import { setToken } from '@/portal/auth'
import type { Integration, PortalProfile, FraudResult } from '@/portal/types'

interface LoginResponse { token: string; profile: PortalProfile }

// Sign in with email + password. Stores the returned session token and returns
// the institution profile. Throws on bad credentials / suspended account.
export const login = async (email: string, password: string): Promise<PortalProfile> => {
  const { data } = await http.post<LoginResponse>('/portal/login', { email, password })
  setToken(data.token)
  return data.profile
}

// Re-fetch the profile for an existing session token.
export const getSession = async (): Promise<PortalProfile> => {
  const { data } = await http.post<PortalProfile>('/portal/session')
  return data
}

// Update this institution's own webhook URL and/or notification events.
export const updateConfig = async (
  payload: { webhook_url?: string; notify_on?: string[] },
): Promise<Integration> => {
  const { data } = await http.patch<Integration>('/portal/config', payload)
  return data
}

// Fire a sample transaction at the detection API to confirm connectivity.
export const testDetect = async (id: number): Promise<FraudResult> => {
  const { data } = await http.post<FraudResult>('/transactions/detect', {
    transaction_id: `portal_test_${id}`,
    user_id: 'portal_test_user',
    amount: 25000,
    currency: 'GHS',
    location: 'Accra, GH',
    merchant_category: 'crypto',
    ip_address: '102.89.44.10',
  })
  return data
}
