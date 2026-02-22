'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { Header } from '@/components/layout/header'
import { adminApi } from '@/lib/api'
import { Feedback } from '@/lib/types'
import { formatDate, getStatusLabel, getStatusColor, getFeedbackTypeLabel } from '@/lib/utils'
import { MessageSquare, Bug, Lightbulb, HelpCircle, ChevronDown, Check, X } from 'lucide-react'

const typeIcons = { bug: Bug, feature: Lightbulb, general: HelpCircle }
const typeColors = {
  bug: 'text-destructive bg-destructive/10',
  feature: 'text-warning bg-warning/10',
  general: 'text-info bg-info/10',
}

function AdminFeedbackContent() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [respondingTo, setRespondingTo] = useState<Feedback | null>(null)
  const [response, setResponse] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadFeedback = async () => {
    setIsLoading(true)
    try {
      const res = await adminApi.listFeedback(statusFilter || undefined)
      setFeedbackList(res.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFeedback()
  }, [statusFilter])

  const openRespond = (feedback: Feedback) => {
    setRespondingTo(feedback)
    setResponse(feedback.admin_response || '')
    setNewStatus(feedback.status)
  }

  const handleRespond = async () => {
    if (!respondingTo) return
    setIsSaving(true)
    try {
      await adminApi.updateFeedback(respondingTo.id, {
        status: newStatus,
        admin_response: response,
      })
      await loadFeedback()
      setRespondingTo(null)
    } finally {
      setIsSaving(false)
    }
  }

  const quickUpdate = async (id: number, status: string) => {
    await adminApi.updateFeedback(id, { status })
    await loadFeedback()
  }

  return (
    <MobileNavProvider>
      <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Feedback verwalten" subtitle="Benutzerfeedback prüfen und beantworten" />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Filter */}
          <div className="flex gap-2 mb-6">
            {[
              { value: '', label: 'Alle' },
              { value: 'pending', label: 'Ausstehend' },
              { value: 'in_review', label: 'In Bearbeitung' },
              { value: 'approved', label: 'Angenommen' },
              { value: 'rejected', label: 'Abgelehnt' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-secondary/30 animate-pulse" />)}
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm text-muted-foreground">Kein Feedback in dieser Kategorie</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbackList.map((feedback, i) => {
                const Icon = typeIcons[feedback.type]
                const isExpanded = expanded === feedback.id

                return (
                  <motion.div
                    key={feedback.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-border bg-card/80 overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-4">
                      <button
                        onClick={() => setExpanded(isExpanded ? null : feedback.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColors[feedback.type]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{feedback.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {getFeedbackTypeLabel(feedback.type)} • {formatDate(feedback.created_at)}
                          </p>
                        </div>
                        <span className={`text-xs font-medium mr-3 ${getStatusColor(feedback.status)}`}>
                          {getStatusLabel(feedback.status)}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Quick actions */}
                      <div className="flex items-center gap-1 ml-3">
                        {feedback.status === 'pending' && (
                          <button
                            onClick={() => quickUpdate(feedback.id, 'in_review')}
                            className="p-1.5 rounded hover:bg-info/10 text-muted-foreground hover:text-info transition-colors"
                            title="In Bearbeitung"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openRespond(feedback)}
                          className="p-1.5 rounded hover:bg-success/10 text-muted-foreground hover:text-success transition-colors"
                          title="Antworten"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        {feedback.status !== 'rejected' && (
                          <button
                            onClick={() => quickUpdate(feedback.id, 'rejected')}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Ablehnen"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border p-4 space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Nachricht</p>
                          <p className="text-sm text-foreground bg-secondary/30 rounded-lg p-3">{feedback.message}</p>
                        </div>
                        {feedback.admin_response && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Admin-Antwort</p>
                            <p className="text-sm text-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">
                              {feedback.admin_response}
                            </p>
                          </div>
                        )}
                        <button
                          onClick={() => openRespond(feedback)}
                          className="text-sm text-primary hover:underline"
                        >
                          {feedback.admin_response ? 'Antwort bearbeiten' : 'Antworten'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* Respond Modal */}
      {respondingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setRespondingTo(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-lg mx-4 rounded-2xl border border-border bg-card shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Feedback beantworten</h2>
              <button onClick={() => setRespondingTo(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-secondary/30">
              <p className="text-sm font-medium text-foreground">{respondingTo.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{respondingTo.message}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="pending">Ausstehend</option>
                  <option value="in_review">In Bearbeitung</option>
                  <option value="approved">Angenommen</option>
                  <option value="rejected">Abgelehnt</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Antwort</label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                  placeholder="Ihre Antwort an den Nutzer..."
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setRespondingTo(null)} className="px-4 py-2 text-sm text-muted-foreground">
                Abbrechen
              </button>
              <button
                onClick={handleRespond}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {isSaving ? 'Speichern...' : 'Antwort senden'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
    </MobileNavProvider>
  )
}

export default function AdminFeedbackPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminFeedbackContent />
    </AuthGuard>
  )
}
