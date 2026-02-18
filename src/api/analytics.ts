// api/analytics.ts
import { http } from './http'
import type { DashboardSummary, FraudStats, LocationRisk, SignalFrequency, TimeSeries, TopUser } from '@/types/fraud'

export const getFraudStats = async (days = 30): Promise<FraudStats> => {
  const res = await http.get('/analytics/stats', { params: { days } })
  return res.data
}

export const getTimeSeries = async (days = 30): Promise<TimeSeries[]> => {
  const res = await http.get('/analytics/timeseries', { params: { days } })
  return res.data
}

export const getTopUsers = async (limit = 10, days = 30): Promise<TopUser[]> => {
  const res = await http.get('/analytics/top_users', { params: { limit, days } })
  return res.data
}

export const getLocationRisk = async (days = 30): Promise<LocationRisk[]> => {
  const res = await http.get('/analytics/locations', { params: { days } })
  return res.data
}

export const getSignalFrequency = async (days = 30): Promise<SignalFrequency[]> => {
  const res = await http.get('/analytics/signals', { params: { days } })
  return res.data
}

export const getDashboard = async (days = 30): Promise<DashboardSummary> => {
  const res = await http.get('/analytics/dashboard', { params: { days } })
  return res.data
}

// Legacy alias kept for any existing imports
export const fraud_stats = getFraudStats
