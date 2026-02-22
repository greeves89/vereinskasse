'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { Header } from '@/components/layout/header'
import { FeedbackForm } from '@/components/feedback/feedback-form'
import { feedbackApi } from '@/lib/api'
import { Feedback } from '@/lib/types'
import { formatDate, getStatusLabel, getStatusColor, getFeedbackTypeLabel } from '@/lib/utils'
import { MessageSquare, Plus, Bug, Lightbulb, HelpCircle, ChevronDown } from 'lucide-react'

const typeIcons = {
  bug: Bug,
  feature: Lightbulb,
  general: HelpCircle,
}

const typeColors = {
  bug: 'text-destructive bg-destructive/10',
  feature: 'text-warning bg-warning/10',
  general: 'text-info bg-info/10',
}

function FeedbackContent() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  const loadFeedback = async () => {
    setIsLoading(true)
    try {
      const response = await feedbackApi.list()
      setFeedbackList(response.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFeedback()
  }, [])

  return (
    <MobileNavProvider>
      <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Feedback"
          subtitle="Fehler melden oder Features wünschen"
          actions={
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Feedback senden
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-secondary/30 animate-pulse" />
              ))}
            </div>
          ) : feedbackList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <MessageSquare className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Noch kein Feedback</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Helfen Sie uns, VereinsKasse zu verbessern!
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Erstes Feedback senden
              </button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {feedbackList.map((feedback, i) => {
                const Icon = typeIcons[feedback.type]
                const typeColor = typeColors[feedback.type]
                const isExpanded = expanded === feedback.id

                return (
                  <motion.div
                    key={feedback.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-card/80 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(isExpanded ? null : feedback.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{feedback.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {getFeedbackTypeLabel(feedback.type)} • {formatDate(feedback.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${getStatusColor(feedback.status)}`}>
                          {getStatusLabel(feedback.status)}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        className="border-t border-border"
                      >
                        <div className="p-4 space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Ihre Nachricht</p>
                            <p className="text-sm text-foreground bg-secondary/30 rounded-lg p-3">{feedback.message}</p>
                          </div>
                          {feedback.admin_response && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Antwort vom Team</p>
                              <p className="text-sm text-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">
                                {feedback.admin_response}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {showForm && (
        <FeedbackForm
          onClose={() => setShowForm(false)}
          onSuccess={loadFeedback}
        />
      )}
    </div>
    </MobileNavProvider>
  )
}

export default function FeedbackPage() {
  return (
    <AuthGuard>
      <FeedbackContent />
    </AuthGuard>
  )
}
