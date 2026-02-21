import { useState, useEffect, useCallback } from 'react'
import { Transaction, TransactionStats } from '@/lib/types'
import { transactionsApi } from '@/lib/api'

export function useTransactions(params?: Record<string, unknown>) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await transactionsApi.list(params)
      setTransactions(response.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Fehler beim Laden der Buchungen')
    } finally {
      setIsLoading(false)
    }
  }, [JSON.stringify(params)])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return { transactions, isLoading, error, refetch: fetchTransactions }
}

export function useTransactionStats() {
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const response = await transactionsApi.stats()
      setStats(response.data)
    } catch {
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [])

  return { stats, isLoading, refetch: fetchStats }
}
