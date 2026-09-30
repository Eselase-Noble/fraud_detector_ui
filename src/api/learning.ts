// api/learning.ts — online-learning pipeline observability
import { http } from './http'

export interface LearningMetrics {
  total_events: number
  window: number
  window_count: number
  accuracy: number | null
  precision: number | null
  recall: number | null
  specificity: number | null
  f1: number | null
  balanced_accuracy: number | null
  mcc: number | null
  auc: number | null
  avg_loss: number | null
  fraud_labels: number
  fraud_rate: number | null
  confusion: { tp: number; fp: number; fn: number; tn: number }
  predicted_positive: number
  notes: string[]
}

export interface CurvePoint { bucket: number; n: number; accuracy: number | null }
export interface SourceCount { source: string; count: number }
export interface FxRate { rate: number; source: string | null; as_of: string | null; base: string; quote: string }

export interface LearningStatus {
  broker: string
  stream: string
  consumer_running: boolean
  pepper_fingerprint: string
  consumed: number
  learned: number
  skipped: number
  deduped: number
  stream_length?: number
  pending?: number
  queue_depth?: number
  fx?: FxRate | null
}

export interface LearningMetricsResponse {
  metrics: LearningMetrics
  curve: CurvePoint[]
  by_source: SourceCount[]
  model: {
    n_updates: number
    influence: number
    is_trusted: boolean
    weights: Record<string, number>
    bias: number
  }
  fx: FxRate | null
}

// Shared prequential window so every view reports the SAME accuracy/precision/recall.
export const LEARNING_WINDOW = 2000

export const getLearningMetrics = async (window = LEARNING_WINDOW, buckets = 20): Promise<LearningMetricsResponse> => {
  const res = await http.get('/learning/metrics', { params: { window, buckets } })
  return res.data
}

export const getLearningStatus = async (): Promise<LearningStatus> => {
  const res = await http.get('/learning/status')
  return res.data
}
