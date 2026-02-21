'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { feedbackApi } from '@/lib/api'
import { MessageSquare, X, Bug, Lightbulb, HelpCircle, Check } from 'lucide-react'

interface FeedbackFormProps {
  onClose: () => void
  onSuccess: () => void
}

const TYPES = [
  { value: 'bug', label: 'Fehler', icon: Bug, color: 'text-destructive', bg: 'bg-destructive/10' },
  { value: 'feature', label: 'Feature-Wunsch', icon: Lightbulb, color: 'text-warning', bg: 'bg-warning/10' },
  { value: 'general', label: 'Allgemeines', icon: HelpCircle, color: 'text-info', bg: 'bg-info/10' },
]

export function FeedbackForm({ onClose, onSuccess }: FeedbackFormProps) {
  const [formData, setFormData] = useState({
    type: 'general',
    title: '',
    message: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      await feedbackApi.create(formData)
      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Fehler beim Senden')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Feedback senden</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {success ? (
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-8 h-8 text-success" />
              </motion.div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Vielen Dank!</h3>
              <p className="text-sm text-muted-foreground">Ihr Feedback wurde erfolgreich übermittelt.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Type selection */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Art des Feedbacks</label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        formData.type === type.value
                          ? `${type.bg} border-current ${type.color}`
                          : 'border-border text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <type.icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Betreff *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Kurze Zusammenfassung..."
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Nachricht *</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={5}
                  placeholder="Beschreiben Sie Ihr Feedback so detailliert wie möglich..."
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Senden...' : 'Feedback senden'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
