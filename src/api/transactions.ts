// api/transactions.ts
import { http } from './http'
import type { BatchFraudResult, FraudResult, Transaction } from '@/types/fraud'

export const detectFraud = async (txn: Transaction): Promise<FraudResult> => {
  const res = await http.post('/transactions/detect', txn)
  return res.data
}

export const batchDetect = async (transactions: Transaction[]): Promise<BatchFraudResult> => {
  const res = await http.post('/transactions/batch_detect', { transactions })
  return res.data
}

export const getAllTransactions = async (params?: {
  limit?: number
  offset?: number
  user_id?: string
  decision?: 'ALLOW' | 'REVIEW' | 'BLOCK'
}): Promise<Transaction[]> => {
  const res = await http.get('/transactions/', { params })
  return res.data
}

export const getTransactionById = async (id: string): Promise<Transaction> => {
  const res = await http.get(`/transactions/${id}`)
  return res.data
}
