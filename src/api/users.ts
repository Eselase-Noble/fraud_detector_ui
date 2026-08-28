// api/users.ts
import { http } from './http'
import type { Transaction } from '@/types/fraud'

export const getUserHistory = async (userId: string, limit = 20): Promise<Transaction[]> => {
  const res = await http.get(`/users/history/${userId}`, { params: { limit } })
  return res.data
}

export const getRiskProfile = async (userId: string): Promise<Record<string, unknown>> => {
  const res = await http.get(`/users/risk_profile/${userId}`)
  return res.data
}
