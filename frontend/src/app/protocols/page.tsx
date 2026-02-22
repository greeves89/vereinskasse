'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { Header } from '@/components/layout/header'
import { protocolsApi } from '@/lib/api'
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Users,
  ListChecks,
  Gavel,
  StickyNote,
} from 'lucide-react'

interface AgendaItem {
  title: string
  description?: string
  result?: string
}

interface Resolution {
  text: string
  votes_yes?: number
  votes_no?: number
  votes_abstain?: number
  passed?: boolean
}

interface Protocol {
  id: number
  title: string
  protocol_type: string
  meeting_date: string
  location?: string
  attendees?: string[]
  agenda_items?: AgendaItem[]
  resolutions?: Resolution[]
  notes?: string
  status: string
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  vorstand: 'Vorstandssitzung',
  hauptversammlung: 'Hauptversammlung',
  ausschuss: 'Ausschusssitzung',
  sonstiges: 'Sonstige Sitzung',
}

const TYPE_COLORS: Record<string, string> = {
  vorstand: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  hauptversammlung: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  ausschuss: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  sonstiges: 'bg-secondary text-muted-foreground border-border',
}

const inputClass = 'w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-sm font-medium text-foreground block mb-1.5'

function ProtocolCard({ protocol, onEdit, onDelete }: {
  protocol: Protocol
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meetingDate = new Date(protocol.meeting_date)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[protocol.protocol_type] || TYPE_COLORS.sonstiges}`}>
              {TYPE_LABELS[protocol.protocol_type] || protocol.protocol_type}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              protocol.status === 'final'
                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
            }`}>
              {protocol.status === 'final' ? 'Finalisiert' : 'Entwurf'}
            </span>
          </div>
          <h3 className="font-semibold text-foreground">{protocol.title}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{meetingDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            {protocol.location && <span>· {protocol.location}</span>}
            {protocol.attendees?.length ? <span>· {protocol.attendees.length} Teilnehmer</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-3 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
        {protocol.agenda_items?.length ? (
          <span className="flex items-center gap-1">
            <ListChecks className="w-3.5 h-3.5" />
            {protocol.agenda_items.length} TOPs
          </span>
        ) : null}
        {protocol.resolutions?.length ? (
          <span className="flex items-center gap-1">
            <Gavel className="w-3.5 h-3.5" />
            {protocol.resolutions.length} Beschlüsse
          </span>
        ) : null}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-4 overflow-hidden"
          >
            {/* Teilnehmer */}
            {protocol.attendees && protocol.attendees.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Teilnehmer
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {protocol.attendees.map((a, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tagesordnung */}
            {protocol.agenda_items && protocol.agenda_items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5" /> Tagesordnung
                </p>
                <ol className="space-y-2">
                  {protocol.agenda_items.map((item, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium text-foreground">{i + 1}. {item.title}</span>
                      {item.description && <p className="text-muted-foreground text-xs mt-0.5">{item.description}</p>}
                      {item.result && (
                        <p className="text-xs mt-0.5 text-green-600">→ Ergebnis: {item.result}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Beschlüsse */}
            {protocol.resolutions && protocol.resolutions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Gavel className="w-3.5 h-3.5" /> Beschlüsse
                </p>
                <ol className="space-y-2">
                  {protocol.resolutions.map((res, i) => (
                    <li key={i} className="text-sm rounded-lg border border-border p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-foreground">{res.text}</p>
                        {res.passed !== undefined && (
                          <span className={`text-xs flex-shrink-0 px-2 py-0.5 rounded-full ${
                            res.passed ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
                          }`}>
                            {res.passed ? 'Angenommen' : 'Abgelehnt'}
                          </span>
                        )}
                      </div>
                      {(res.votes_yes !== undefined || res.votes_no !== undefined) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ja: {res.votes_yes ?? '-'} | Nein: {res.votes_no ?? '-'} | Enthaltungen: {res.votes_abstain ?? '-'}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Notizen */}
            {protocol.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" /> Notizen
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{protocol.notes}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ProtocolModal({
  protocol,
  onClose,
  onSave,
}: {
  protocol?: Protocol | null
  onClose: () => void
  onSave: () => void
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    title: protocol?.title || '',
    protocol_type: protocol?.protocol_type || 'vorstand',
    meeting_date: protocol?.meeting_date ? new Date(protocol.meeting_date).toISOString().slice(0, 16) : '',
    location: protocol?.location || '',
    notes: protocol?.notes || '',
    status: protocol?.status || 'draft',
  })
  const [attendees, setAttendees] = useState<string[]>(protocol?.attendees || [])
  const [attendeeInput, setAttendeeInput] = useState('')
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(protocol?.agenda_items || [])
  const [resolutions, setResolutions] = useState<Resolution[]>(protocol?.resolutions || [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const data = {
        ...form,
        meeting_date: new Date(form.meeting_date).toISOString(),
        location: form.location || null,
        notes: form.notes || null,
        attendees,
        agenda_items: agendaItems,
        resolutions,
      }
      if (protocol) {
        await protocolsApi.update(protocol.id, data)
      } else {
        await protocolsApi.create(data)
      }
      onSave()
    } finally {
      setIsSaving(false)
    }
  }

  const addAttendee = () => {
    if (attendeeInput.trim()) {
      setAttendees(prev => [...prev, attendeeInput.trim()])
      setAttendeeInput('')
    }
  }

  const addAgendaItem = () => {
    setAgendaItems(prev => [...prev, { title: '', description: '', result: '' }])
  }

  const updateAgendaItem = (i: number, field: keyof AgendaItem, value: string) => {
    setAgendaItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const addResolution = () => {
    setResolutions(prev => [...prev, { text: '' }])
  }

  const updateResolution = (i: number, field: keyof Resolution, value: any) => {
    setResolutions(prev => prev.map((res, idx) => idx === i ? { ...res, [field]: value } : res))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{protocol ? 'Protokoll bearbeiten' : 'Neues Protokoll'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Grunddaten */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Titel *</label>
              <input type="text" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required placeholder="z.B. Vorstandssitzung Februar 2026"
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Art *</label>
              <select value={form.protocol_type}
                onChange={e => setForm({ ...form, protocol_type: e.target.value })}
                className={inputClass}>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className={inputClass}>
                <option value="draft">Entwurf</option>
                <option value="final">Finalisiert</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Datum & Uhrzeit *</label>
              <input type="datetime-local" value={form.meeting_date}
                onChange={e => setForm({ ...form, meeting_date: e.target.value })}
                required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Ort</label>
              <input type="text" value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="z.B. Vereinsheim" className={inputClass} />
            </div>
          </div>

          {/* Teilnehmer */}
          <div>
            <label className={labelClass}>Teilnehmer</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={attendeeInput}
                onChange={e => setAttendeeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttendee() } }}
                placeholder="Name eingeben, Enter drücken"
                className={inputClass} />
              <button type="button" onClick={addAttendee}
                className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-secondary/50 flex-shrink-0">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {attendees.map((a, i) => (
                <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary">
                  {a}
                  <button type="button" onClick={() => setAttendees(prev => prev.filter((_, idx) => idx !== i))}
                    className="hover:text-destructive ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Tagesordnung */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass + ' mb-0'}>Tagesordnungspunkte</label>
              <button type="button" onClick={addAgendaItem}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Hinzufügen
              </button>
            </div>
            {agendaItems.map((item, i) => (
              <div key={i} className="mb-2 rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium w-5 flex-shrink-0">{i + 1}.</span>
                  <input type="text" value={item.title}
                    onChange={e => updateAgendaItem(i, 'title', e.target.value)}
                    placeholder="Titel des Tagesordnungspunkts"
                    className={inputClass + ' text-xs py-1.5'} />
                  <button type="button" onClick={() => setAgendaItems(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input type="text" value={item.description || ''}
                  onChange={e => updateAgendaItem(i, 'description', e.target.value)}
                  placeholder="Beschreibung (optional)"
                  className={inputClass + ' text-xs py-1.5'} />
                <input type="text" value={item.result || ''}
                  onChange={e => updateAgendaItem(i, 'result', e.target.value)}
                  placeholder="Ergebnis/Beschluss (optional)"
                  className={inputClass + ' text-xs py-1.5'} />
              </div>
            ))}
          </div>

          {/* Beschlüsse */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass + ' mb-0'}>Beschlüsse</label>
              <button type="button" onClick={addResolution}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Hinzufügen
              </button>
            </div>
            {resolutions.map((res, i) => (
              <div key={i} className="mb-2 rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <input type="text" value={res.text}
                    onChange={e => updateResolution(i, 'text', e.target.value)}
                    placeholder="Beschlusstext"
                    className={inputClass + ' text-xs py-1.5'} />
                  <button type="button" onClick={() => setResolutions(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive flex-shrink-0 mt-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['votes_yes', 'votes_no', 'votes_abstain'].map(field => (
                    <input key={field} type="number" min="0"
                      value={(res as any)[field] ?? ''}
                      onChange={e => updateResolution(i, field as any, parseInt(e.target.value) || undefined)}
                      placeholder={field === 'votes_yes' ? 'Ja' : field === 'votes_no' ? 'Nein' : 'Enthal.'}
                      className={inputClass + ' text-xs py-1.5'} />
                  ))}
                  <select value={res.passed === undefined ? '' : res.passed ? 'true' : 'false'}
                    onChange={e => updateResolution(i, 'passed', e.target.value === '' ? undefined : e.target.value === 'true')}
                    className={inputClass + ' text-xs py-1.5'}>
                    <option value="">Status</option>
                    <option value="true">Angenommen</option>
                    <option value="false">Abgelehnt</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Notizen */}
          <div>
            <label className={labelClass}>Zusätzliche Notizen</label>
            <textarea value={form.notes} rows={3}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className={`${inputClass} resize-none`}
              placeholder="Weitere Anmerkungen zum Protokoll..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
              Abbrechen
            </button>
            <button type="submit" disabled={isSaving}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {isSaving ? 'Speichern...' : protocol ? 'Aktualisieren' : 'Erstellen'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function ProtocolsContent() {
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProtocol, setEditProtocol] = useState<Protocol | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const loadProtocols = async () => {
    setIsLoading(true)
    try {
      const res = await protocolsApi.list({
        ...(filterType ? { protocol_type: filterType } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
      })
      setProtocols(res.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadProtocols() }, [filterType, filterStatus])

  const handleDelete = async (p: Protocol) => {
    if (confirm(`Protokoll "${p.title}" löschen?`)) {
      await protocolsApi.delete(p.id)
      setProtocols(prev => prev.filter(x => x.id !== p.id))
    }
  }

  const openEdit = (p: Protocol) => {
    setEditProtocol(p)
    setShowModal(true)
  }

  const openCreate = () => {
    setEditProtocol(null)
    setShowModal(true)
  }

  const handleSave = () => {
    setShowModal(false)
    setEditProtocol(null)
    loadProtocols()
  }

  return (
    <MobileNavProvider>
      <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Protokollverwaltung"
          subtitle="Sitzungsprotokolle, Tagesordnungen und Beschlüsse verwalten"
          actions={
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Neues Protokoll
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <div className="flex gap-3 mb-5">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Alle Sitzungsarten</option>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Alle Status</option>
              <option value="draft">Entwurf</option>
              <option value="final">Finalisiert</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : protocols.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-foreground mb-1">Keine Protokolle vorhanden</p>
              <p className="text-sm text-muted-foreground mb-4">
                Erstellen Sie Protokolle für Vorstands- und Hauptversammlungen
              </p>
              <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                <Plus className="w-4 h-4" />
                Erstes Protokoll anlegen
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {protocols.map(p => (
                <ProtocolCard
                  key={p.id}
                  protocol={p}
                  onEdit={() => openEdit(p)}
                  onDelete={() => handleDelete(p)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>

      {showModal && (
        <ProtocolModal
          protocol={editProtocol}
          onClose={() => { setShowModal(false); setEditProtocol(null) }}
          onSave={handleSave}
        />
      )}
    </MobileNavProvider>
  )
}

export default function ProtocolsPage() {
  return (
    <AuthGuard>
      <ProtocolsContent />
    </AuthGuard>
  )
}
