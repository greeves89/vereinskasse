'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { adminApi } from '@/lib/api'
import { AdminStats } from '@/lib/types'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Users, Crown, BookOpen, MessageSquare, Activity, Shield } from 'lucide-react'

function AdminDashboardContent() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    adminApi.stats()
      .then((r) => setStats(r.data))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Admin Dashboard" subtitle="Systemübersicht und Verwaltung" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Administrator-Bereich</p>
              <p className="text-xs text-muted-foreground">
                Sie haben vollen Zugriff auf alle Systemfunktionen
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatsCard
              title="Benutzer gesamt"
              value={isLoading ? '...' : String(stats?.total_users || 0)}
              icon={Users}
              color="primary"
              delay={0}
            />
            <StatsCard
              title="Premium-Nutzer"
              value={isLoading ? '...' : String(stats?.premium_users || 0)}
              icon={Crown}
              color="warning"
              delay={0.1}
            />
            <StatsCard
              title="Mitglieder gesamt"
              value={isLoading ? '...' : String(stats?.total_members || 0)}
              icon={Activity}
              color="info"
              delay={0.2}
            />
            <StatsCard
              title="Buchungen gesamt"
              value={isLoading ? '...' : String(stats?.total_transactions || 0)}
              icon={BookOpen}
              color="success"
              delay={0.3}
            />
            <StatsCard
              title="Offenes Feedback"
              value={isLoading ? '...' : String(stats?.pending_feedback || 0)}
              icon={MessageSquare}
              color={stats?.pending_feedback && stats.pending_feedback > 0 ? 'warning' : 'primary'}
              delay={0.4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.a
              href="/admin/users"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card/80 hover:bg-card hover:border-primary/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Benutzerverwaltung</p>
                <p className="text-sm text-muted-foreground">
                  Nutzer anzeigen, bearbeiten, Abos verwalten
                </p>
              </div>
            </motion.a>

            <motion.a
              href="/admin/feedback"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card/80 hover:bg-card hover:border-primary/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Feedback verwalten</p>
                <p className="text-sm text-muted-foreground">
                  Feedback prüfen, beantworten und moderieren
                </p>
              </div>
            </motion.a>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminDashboardContent />
    </AuthGuard>
  )
}
