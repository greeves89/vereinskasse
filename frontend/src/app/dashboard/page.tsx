'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { Header } from '@/components/layout/header'
import { StatsCard } from '@/components/dashboard/stats-card'
import { MonthlyChart } from '@/components/dashboard/monthly-chart'
import { CategoryChart } from '@/components/dashboard/category-chart'
import { useAuthStore } from '@/lib/auth'
import { useTransactionStats } from '@/hooks/use-transactions'
import { useMemberStats } from '@/hooks/use-members'
import { transactionsApi } from '@/lib/api'
import { Transaction } from '@/lib/types'
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, DollarSign, Users,
  BookOpen, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

function DashboardContent() {
  const { user } = useAuthStore()
  const { stats, isLoading: statsLoading } = useTransactionStats()
  const { stats: memberStats } = useMemberStats()
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    transactionsApi.list({ limit: 5 }).then((r) => setRecentTransactions(r.data))
  }, [])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Guten Morgen'
    if (hour < 18) return 'Guten Tag'
    return 'Guten Abend'
  }

  return (
    <MobileNavProvider>
      <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Dashboard"
          subtitle={`${greeting()}, ${user?.name?.split(' ')[0]}!`}
        />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatsCard
              title="Kassenstand"
              value={statsLoading ? '...' : formatCurrency(stats?.balance || '0')}
              subtitle="Gesamtsaldo"
              icon={DollarSign}
              color="primary"
              delay={0}
            />
            <StatsCard
              title="Einnahmen (Monat)"
              value={statsLoading ? '...' : formatCurrency(stats?.month_income || '0')}
              subtitle="Laufender Monat"
              icon={TrendingUp}
              color="success"
              delay={0.1}
            />
            <StatsCard
              title="Ausgaben (Monat)"
              value={statsLoading ? '...' : formatCurrency(stats?.month_expense || '0')}
              subtitle="Laufender Monat"
              icon={TrendingDown}
              color="destructive"
              delay={0.2}
            />
            <StatsCard
              title="Mitglieder"
              value={memberStats ? `${memberStats.active}` : '...'}
              subtitle={memberStats?.limit ? `von ${memberStats.limit} (kostenlos)` : 'aktive Mitglieder'}
              icon={Users}
              color="info"
              delay={0.3}
            />
          </div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-border bg-card/80 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Letzte Buchungen</h2>
              </div>
              <a href="/transactions" className="text-xs text-primary hover:underline">
                Alle anzeigen
              </a>
            </div>

            <div className="divide-y divide-border">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Noch keine Buchungen vorhanden</p>
                  <a href="/transactions" className="text-xs text-primary hover:underline mt-1 block">
                    Erste Buchung anlegen
                  </a>
                </div>
              ) : (
                recentTransactions.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        t.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'
                      }`}>
                        {t.type === 'income'
                          ? <ArrowUpRight className="w-4 h-4 text-success" />
                          : <ArrowDownRight className="w-4 h-4 text-destructive" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.category && `${t.category} • `}{formatDate(t.transaction_date)}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      t.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Monthly Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Einnahmen & Ausgaben (6 Monate)</h2>
            </div>
            <MonthlyChart />
          </motion.div>

          {/* Category Charts */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5">
              <h2 className="font-semibold text-foreground mb-4">Einnahmen nach Kategorie</h2>
              <CategoryChart type="income" />
            </div>
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5">
              <h2 className="font-semibold text-foreground mb-4">Ausgaben nach Kategorie</h2>
              <CategoryChart type="expense" />
            </div>
          </motion.div>

          {/* Summary stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5"
          >
            <h2 className="font-semibold text-foreground mb-4">Gesamtübersicht</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Gesamteinnahmen</p>
                <p className="text-xl font-bold text-success">
                  {statsLoading ? '...' : formatCurrency(stats?.total_income || '0')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Gesamtausgaben</p>
                <p className="text-xl font-bold text-destructive">
                  {statsLoading ? '...' : formatCurrency(stats?.total_expense || '0')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Buchungen gesamt</p>
                <p className="text-xl font-bold text-foreground">
                  {statsLoading ? '...' : stats?.transaction_count || 0}
                </p>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
    </MobileNavProvider>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
