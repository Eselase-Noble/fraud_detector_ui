// /src/api/portal.ts — self-service partner portal, authenticated by API key.
import { http } from '@/api/http'
import type { Integration } from '@/api/admin'

export interface PortalProfile {
  integration: Integration
  usage: { scored: number; blocked: number; reviewed: number }
}

// Sign in with an API key. Throws on 401/403 (invalid / suspended).
export const portalSession = async (apiKey: string): Promise<PortalProfile> => {
  const { data } = await http.post<PortalProfile>('/portal/session', null, {
    headers: { 'X-API-Key': apiKey },
  })
  return data
}

// Update the institution's own webhook URL and/or notification events.
export const portalUpdateConfig = async (
  apiKey: string,
  payload: { webhook_url?: string; notify_on?: string[] },
): Promise<Integration> => {
  const { data } = await http.patch<Integration>('/portal/config', payload, {
    headers: { 'X-API-Key': apiKey },
  })
  return data
}
