// types/fraud.ts

export interface Transaction {
  transaction_id: string
  user_id: string
  amount: number
  currency: string
  location?: string
  merchant_id?: string
  merchant_category?: string
  device_id?: string
  ip_address?: string
  timestamp: string
}

export interface FraudResult {
  transaction_id: string
  score: number
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK'
  reason: string
  signals: string[]
  processed_at: string
}

export interface BatchFraudResult {
  total: number
  blocked: number
  reviewed: number
  allowed: number
  results: FraudResult[]
  processed_at: string
}

// Analytics
export interface FraudStats {
  total_transactions: number
  blocked: number
  reviewed: number
  allowed: number
  fraud_rate: number
  review_rate: number
  total_flagged_amount: number
  avg_flagged_amount: number
}

export interface TimeSeries {
  date: string
  total: number
  blocked: number
  reviewed: number
  allowed: number
  total_amount: number
}

export interface LocationRisk {
  location: string
  transaction_count: number
  blocked_count: number
  total_amount: number
  risk_score: number
}

export interface TopUser {
  user_id: string
  transaction_count: number
  blocked_count: number
  total_amount: number
  risk_score: number
}

export interface SignalFrequency {
  signal: string
  count: number
  pct: number
}

export interface DashboardSummary {
  stats: FraudStats
  recent_timeseries: TimeSeries[]
  top_risky_users: TopUser[]
  location_breakdown: LocationRisk[]
  signal_frequency: SignalFrequency[]
}

// Knowledge base
export interface KnowledgeStats {
  total_documents: number
  directories: Record<string, number>
}

export interface SearchResult {
  content: string
  source?: string
  score?: number
}
