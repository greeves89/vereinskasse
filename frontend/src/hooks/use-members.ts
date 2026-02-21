import { useState, useEffect, useCallback } from 'react'
import { Member, MemberStats } from '@/lib/types'
import { membersApi } from '@/lib/api'

export function useMembers(params?: { status?: string; search?: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await membersApi.list(params)
      setMembers(response.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Fehler beim Laden der Mitglieder')
    } finally {
      setIsLoading(false)
    }
  }, [params?.status, params?.search])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  return { members, isLoading, error, refetch: fetchMembers }
}

export function useMemberStats() {
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    membersApi.stats()
      .then((r) => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setIsLoading(false))
  }, [])

  return { stats, isLoading }
}
