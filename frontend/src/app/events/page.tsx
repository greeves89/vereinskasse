'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import api from '@/lib/api'
import {
  Calendar, Plus, Edit2, Trash2, X, Users, MapPin, Clock, UserPlus, UserMinus,
} from 'lucide-react'

interface Member {
  id: number
  first_name: string
  last_name: string
  email?: string
}

interface Registration {
  id: number
  member_id: number
  status: string
  notes?: string
  registered_at: string
  member?: Member
}

interface Event {
  id: number
  title: string
  description?: string
  location?: string
  event_date: string
  end_date?: string
  max_participants?: number
  is_public: boolean
  created_at: string
  registrations: Registration[]
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isPast(iso: string): boolean {
  return new Date(iso) < new Date()
}

function EventsContent() {
  const [events, setEvents] = useState<Event[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [detailEvent, setDetailEvent] = useState<Event | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [addingMemberId, setAddingMemberId] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    end_date: '',
    max_participants: '',
    is_public: true,
  })

  const loadEvents = async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/events')
      setEvents(res.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/events'),
      api.get('/members'),
    ]).then(([evRes, mbRes]) => {
      setEvents(evRes.data)
      setMembers(mbRes.data)
      setIsLoading(false)
    })
  }, [])

  const openForm = (event?: Event) => {
    if (event) {
      setEditEvent(event)
      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        event_date: event.event_date.slice(0, 16),
        end_date: event.end_date ? event.end_date.slice(0, 16) : '',
        max_participants: event.max_participants ? String(event.max_participants) : '',
        is_public: event.is_public,
      })
    } else {
      setEditEvent(null)
      setFormData({
        title: '',
        description: '',
        location: '',
        event_date: '',
        end_date: '',
        max_participants: '',
        is_public: true,
      })
    }
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const data = {
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        event_date: formData.event_date,
        end_date: formData.end_date || null,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        is_public: formData.is_public,
      }
      if (editEvent) {
        await api.put(`/events/${editEvent.id}`, data)
      } else {
        await api.post('/events', data)
      }
      await loadEvents()
      setShowForm(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (event: Event) => {
    if (confirm(`Veranstaltung "${event.title}" löschen?`)) {
      await api.delete(`/events/${event.id}`)
      setEvents((prev) => prev.filter((e) => e.id !== event.id))
      if (detailEvent?.id === event.id) setDetailEvent(null)
    }
  }

  const handleRegister = async () => {
    if (!detailEvent || !addingMemberId) return
    try {
      await api.post(`/events/${detailEvent.id}/register`, { member_id: parseInt(addingMemberId) })
      const res = await api.get('/events')
      setEvents(res.data)
      const updated = res.data.find((e: Event) => e.id === detailEvent.id)
      if (updated) setDetailEvent(updated)
      setAddingMemberId('')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Fehler bei der Anmeldung')
    }
  }

  const handleUnregister = async (memberId: number) => {
    if (!detailEvent) return
    await api.delete(`/events/${detailEvent.id}/register/${memberId}`)
    const res = await api.get('/events')
    setEvents(res.data)
    const updated = res.data.find((e: Event) => e.id === detailEvent.id)
    if (updated) setDetailEvent(updated)
  }

  const upcomingEvents = events.filter((e) => !isPast(e.event_date))
  const pastEvents = events.filter((e) => isPast(e.event_date))

  const registeredMemberIds = new Set(detailEvent?.registrations.map((r) => r.member_id) || [])
  const availableMembers = members.filter((m) => !registeredMemberIds.has(m.id))

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Veranstaltungen"
          subtitle="Termine erstellen und Teilnehmer verwalten"
          actions={
            <button
              onClick={() => openForm()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Veranstaltung anlegen
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-foreground mb-1">Keine Veranstaltungen</p>
              <p className="text-sm text-muted-foreground mb-4">Erstellen Sie Termine für Hauptversammlungen, Trainings und Events</p>
              <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                <Plus className="w-4 h-4" />
                Erste Veranstaltung anlegen
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {upcomingEvents.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Kommende Veranstaltungen ({upcomingEvents.length})
                  </h2>
                  <div className="space-y-3">
                    {upcomingEvents.map((event, i) => (
                      <EventCard key={event.id} event={event} index={i} onEdit={openForm} onDelete={handleDelete} onDetail={setDetailEvent} />
                    ))}
                  </div>
                </div>
              )}
              {pastEvents.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Vergangene Veranstaltungen ({pastEvents.length})
                  </h2>
                  <div className="space-y-3 opacity-60">
                    {pastEvents.map((event, i) => (
                      <EventCard key={event.id} event={event} index={i} onEdit={openForm} onDelete={handleDelete} onDetail={setDetailEvent} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{editEvent ? 'Veranstaltung bearbeiten' : 'Neue Veranstaltung'}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Titel *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="z.B. Jahreshauptversammlung 2026" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Datum & Uhrzeit *</label>
                  <input type="datetime-local" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} required className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Ende (optional)</label>
                  <input type="datetime-local" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Ort</label>
                <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="z.B. Vereinsheim, Hauptstraße 1" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Beschreibung</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Max. Teilnehmer (optional)</label>
                <input type="number" value={formData.max_participants} onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })} min="1" className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Unbegrenzt" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Abbrechen</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {isSaving ? 'Speichern...' : editEvent ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Detail / Teilnehmerliste Modal */}
      {detailEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setDetailEvent(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold">{detailEvent.title}</h2>
                <p className="text-xs text-muted-foreground">{formatDateTime(detailEvent.event_date)}</p>
              </div>
              <button onClick={() => setDetailEvent(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Teilnehmer ({detailEvent.registrations.length}{detailEvent.max_participants ? `/${detailEvent.max_participants}` : ''})
                </p>
                {detailEvent.registrations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Noch keine Anmeldungen</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detailEvent.registrations.map((reg) => (
                      <div key={reg.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                        <span className="text-sm text-foreground">
                          {reg.member ? `${reg.member.first_name} ${reg.member.last_name}` : `Mitglied #${reg.member_id}`}
                        </span>
                        <button onClick={() => handleUnregister(reg.member_id)} className="p-1 rounded text-muted-foreground hover:text-destructive">
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {availableMembers.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={addingMemberId}
                    onChange={(e) => setAddingMemberId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Mitglied auswählen...</option>
                    {availableMembers.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleRegister}
                    disabled={!addingMemberId}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    Anmelden
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function EventCard({ event, index, onEdit, onDelete, onDetail }: {
  event: Event
  index: number
  onEdit: (e: Event) => void
  onDelete: (e: Event) => void
  onDetail: (e: Event) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start justify-between p-4 rounded-xl border border-border bg-card/80 hover:bg-card transition-colors group cursor-pointer"
      onClick={() => onDetail(event)}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">{event.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(event.event_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.registrations.length}{event.max_participants ? `/${event.max_participants}` : ''} Teilnehmer</span>
          </div>
          {event.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{event.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onEdit(event)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(event)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </motion.div>
  )
}

export default function EventsPage() {
  return (
    <AuthGuard>
      <EventsContent />
    </AuthGuard>
  )
}
