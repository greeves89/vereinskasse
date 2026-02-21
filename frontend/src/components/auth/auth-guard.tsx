'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetchUser().finally(() => setChecked(true))
  }, [])

  useEffect(() => {
    if (!checked) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (requireAdmin && user?.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [checked, isAuthenticated, user, requireAdmin])

  if (!checked || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  if (!isAuthenticated) return null
  if (requireAdmin && user?.role !== 'admin') return null

  return <>{children}</>
}
