'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { PaymentRemindersPanel } from '@/components/members/payment-reminders-panel'
import { paymentRemindersApi, membersApi } from '@/lib/api'
import { Member, MemberPaymentOverview } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Bell, AlertCircle, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react'

function BeitraegeContent() {
  const [overview, setOverview] = useState<MemberPaymentOverview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const fetchOverview = async () => {
    setIsLoading(true)
    try {
      const res = await paymentRemindersApi.paymentOverview()
      setOverview(res.data)
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  const handleOpenReminders = async (item: MemberPaymentOverview) => {
    try {
      const res = await membersApi.get(item.member_id)
      setSelectedMember(res.data)
    } catch {
      // silent
    }
  }

  const totalDue = overview.reduce((sum, m) => sum + m.total_due, 0)
  const overdueCount = overview.filter((m) => m.overdue_count > 0).length
  const withOpenCount = overview.filter((m) => m.open_reminders > 0).length

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Beitragsverfolgung"
          subtitle="Offene und überfällige Mitgliedsbeiträge"
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-border bg-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gesamt offen</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalDue)}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="p-4 rounded-xl border border-border bg-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mitglieder überfällig</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{overdueCount}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="p-4 rounded-xl border border-border bg-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Offene Erinnerungen</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{withOpenCount}</p>
            </motion.div>
          </div>

          {/* Members list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />
              ))}
            </div>
          ) : overview.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <CheckCircle className="w-12 h-12 text-green-500/40 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Alles auf dem neuesten Stand</h3>
              <p className="text-sm text-muted-foreground">
                Keine aktiven Mitglieder oder keine offenen Beiträge
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {overview.map((item, i) => (
                <motion.button
                  key={item.member_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleOpenReminders(item)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-colors hover:bg-card ${
                    item.overdue_count > 0
                      ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10'
                      : item.open_reminders > 0
                      ? 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
                      : 'border-border bg-secondary/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {item.member_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.member_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.beitrag_monthly && (
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(item.beitrag_monthly)}/Monat
                          </span>
                        )}
                        {item.email && (
                          <span className="text-xs text-muted-foreground">{item.email}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {item.open_reminders > 0 ? (
                        <>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(item.total_due)}
                          </p>
                          <div className="flex items-center gap-1.5 justify-end mt-0.5">
                            {item.overdue_count > 0 && (
                              <span className="flex items-center gap-0.5 text-xs font-medium text-red-500">
                                <AlertCircle className="w-3 h-3" />
                                {item.overdue_count} überfällig
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {item.open_reminders} offen
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Kein Rückstand
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </main>
      </div>

      {selectedMember && (
        <PaymentRemindersPanel
          member={selectedMember}
          onClose={() => {
            setSelectedMember(null)
            fetchOverview()
          }}
        />
      )}
    </div>
  )
}

export default function BeitraegePage() {
  return (
    <AuthGuard>
      <BeitraegeContent />
    </AuthGuard>
  )
}
