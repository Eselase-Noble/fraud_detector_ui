// api/learning.ts — online-learning pipeline observability
import { http } from './http'

export interface LearningMetrics {
  total_events: number
  window: number
  window_count: number
  accuracy: number | null
  precision: number | null
  recall: number | null
  f1: number | null
  avg_loss: number | null
  fraud_labels: number
}

export interface CurvePoint { bucket: number; n: number; accuracy: number | null }
export interface SourceCount { source: string; count: number }

export interface LearningStatus {
  broker: string
  stream: string
  consumer_running: boolean
  pepper_fingerprint: string
  consumed: number
  learned: number
  skipped: number
  stream_length?: number
  pending?: number
  queue_depth?: number
}

export interface LearningMetricsResponse {
  metrics: LearningMetrics
  curve: CurvePoint[]
  by_source: SourceCount[]
  model: {
    n_updates: number
    influence: number
    is_trusted: boolean
  }
}

export const getLearningMetrics = async (window = 1000, buckets = 20): Promise<LearningMetricsResponse> => {
  const res = await http.get('/learning/metrics', { params: { window, buckets } })
  return res.data
}

export const getLearningStatus = async (): Promise<LearningStatus> => {
  const res = await http.get('/learning/status')
  return res.data
}
