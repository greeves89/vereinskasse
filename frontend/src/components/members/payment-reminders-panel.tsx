'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Member, PaymentReminder } from '@/lib/types'
import { paymentRemindersApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  X, Bell, Plus, Send, Trash2, CheckCircle, Clock, AlertCircle,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface PaymentRemindersPanelProps {
  member: Member
  onClose: () => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Ausstehend', color: 'text-amber-500', icon: <Clock className="w-3.5 h-3.5" /> },
  sent: { label: 'Gesendet', color: 'text-blue-500', icon: <Send className="w-3.5 h-3.5" /> },
  paid: { label: 'Bezahlt', color: 'text-green-500', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  overdue: { label: 'Überfällig', color: 'text-red-500', icon: <AlertCircle className="w-3.5 h-3.5" /> },
}

export function PaymentRemindersPanel({ member, onClose }: PaymentRemindersPanelProps) {
  const [reminders, setReminders] = useState<PaymentReminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ amount: '', due_date: '', notes: '' })
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [sendSuccess, setSendSuccess] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchReminders = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await paymentRemindersApi.list(member.id, statusFilter || undefined)
      setReminders(res.data)
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }, [member.id, statusFilter])

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  // Prefill amount from member's monthly fee
  useEffect(() => {
    if (member.beitrag_monthly) {
      setFormData((prev) => ({ ...prev, amount: member.beitrag_monthly! }))
    }
  }, [member.beitrag_monthly])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError('')
    try {
      await paymentRemindersApi.create(member.id, {
        amount: formData.amount,
        due_date: formData.due_date,
        notes: formData.notes || undefined,
      })
      setShowForm(false)
      setFormData({ amount: member.beitrag_monthly || '', due_date: '', notes: '' })
      fetchReminders()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setFormError(error.response?.data?.detail || 'Fehler beim Erstellen')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMarkPaid = async (reminder: PaymentReminder) => {
    try {
      await paymentRemindersApi.update(member.id, reminder.id, { status: 'paid' })
      fetchReminders()
    } catch {
      // silent
    }
  }

  const handleDelete = async (reminder: PaymentReminder) => {
    if (!confirm('Erinnerung löschen?')) return
    try {
      await paymentRemindersApi.delete(member.id, reminder.id)
      fetchReminders()
    } catch {
      // silent
    }
  }

  const handleSend = async (reminder: PaymentReminder) => {
    setSendingId(reminder.id)
    try {
      await paymentRemindersApi.send(member.id, reminder.id)
      setSendSuccess(reminder.id)
      setTimeout(() => setSendSuccess(null), 3000)
      fetchReminders()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast(error.response?.data?.detail || 'E-Mail konnte nicht gesendet werden', 'error')
    } finally {
      setSendingId(null)
    }
  }

  const totalDue = reminders
    .filter((r) => r.status !== 'paid')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0)

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
          className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Beitragsverfolgung</h2>
                <p className="text-xs text-muted-foreground">{member.first_name} {member.last_name}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-px bg-border flex-shrink-0">
            <div className="bg-card px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Offen</p>
              <p className="text-lg font-bold text-foreground">
                {reminders.filter((r) => r.status !== 'paid').length}
              </p>
            </div>
            <div className="bg-card px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Überfällig</p>
              <p className="text-lg font-bold text-red-500">
                {reminders.filter((r) => r.status === 'overdue').length}
              </p>
            </div>
            <div className="bg-card px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Gesamt offen</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalDue)}</p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm px-2 py-1.5 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Alle Status</option>
              <option value="pending">Ausstehend</option>
              <option value="sent">Gesendet</option>
              <option value="overdue">Überfällig</option>
              <option value="paid">Bezahlt</option>
            </select>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Erinnerung anlegen
            </button>
          </div>

          {/* Create form */}
          <AnimatePresence>
            {showForm && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleCreate}
                className="border-b border-border overflow-hidden flex-shrink-0"
              >
                <div className="px-6 py-4 space-y-3">
                  {formError && (
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                      {formError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Betrag (€) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Fälligkeitsdatum *</label>
                      <input
                        type="date"
                        required
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Notiz (optional)</label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="z.B. Jahresbeitrag 2026"
                      className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? 'Speichern...' : 'Anlegen'}
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Reminders list */}
          <div className="overflow-y-auto flex-1 p-4 space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />
                ))}
              </div>
            ) : reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Keine Erinnerungen vorhanden</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Legen Sie eine Beitragserinnerung an
                </p>
              </div>
            ) : (
              reminders.map((reminder) => {
                const cfg = STATUS_CONFIG[reminder.status] ?? STATUS_CONFIG.pending
                const isOverdue = new Date(reminder.due_date) < new Date() && reminder.status !== 'paid'
                return (
                  <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border ${
                      isOverdue ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-secondary/20'
                    } group`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(parseFloat(reminder.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fällig: {formatDate(reminder.due_date)}
                          {reminder.notes && <span className="ml-2 italic">{reminder.notes}</span>}
                        </p>
                        {reminder.sent_at && (
                          <p className="text-xs text-muted-foreground">
                            Gesendet: {formatDate(reminder.sent_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Send email */}
                      {reminder.status !== 'paid' && member.email && (
                        <button
                          onClick={() => handleSend(reminder)}
                          disabled={sendingId === reminder.id}
                          title="E-Mail senden"
                          className="p-1.5 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors disabled:opacity-50"
                        >
                          {sendingId === reminder.id ? (
                            <span className="text-xs">...</span>
                          ) : sendSuccess === reminder.id ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {/* Mark paid */}
                      {reminder.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkPaid(reminder)}
                          title="Als bezahlt markieren"
                          className="p-1.5 rounded-lg hover:bg-green-500/10 text-muted-foreground hover:text-green-500 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(reminder)}
                        title="Löschen"
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
