'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { Header } from '@/components/layout/header'
import api from '@/lib/api'
import { Download, CreditCard, Users, AlertTriangle, CheckCircle, Loader2, Info } from 'lucide-react'

interface MemberPreview {
  id: number
  name: string
  member_number?: string
  iban?: string
  beitrag_monthly?: number
  has_iban: boolean
  has_beitrag: boolean
}

interface PreviewData {
  total_members: number
  members_with_iban: MemberPreview[]
  ready_for_sepa: number
}

const inputClass = 'w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-sm font-medium text-foreground block mb-1.5'

function SepaContent() {
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const today = new Date()
  const defaultDate = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0]

  const [form, setForm] = useState({
    collection_date: defaultDate,
    creditor_iban: '',
    creditor_bic: '',
    creditor_id: '',
  })

  useEffect(() => {
    api.get('/sepa/preview').then((res: any) => {
      setPreview(res.data)
      setIsLoadingPreview(false)
    }).catch(() => setIsLoadingPreview(false))
  }, [])

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsExporting(true)
    setExportError('')
    try {
      const res = await fetch('/api/v1/sepa/export', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_date: form.collection_date,
          creditor_iban: form.creditor_iban,
          creditor_bic: form.creditor_bic,
          creditor_id: form.creditor_id,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Fehler ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = form.collection_date.slice(0, 7)
      a.href = url
      a.download = `SEPA-Lastschrift-${date}.xml`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setExportError(err.message || 'Export fehlgeschlagen.')
    } finally {
      setIsExporting(false)
    }
  }

  const readyMembers = preview?.members_with_iban.filter(m => m.has_iban && m.has_beitrag) || []
  const missingMembers = preview?.members_with_iban.filter(m => !m.has_iban || !m.has_beitrag) || []

  return (
    <MobileNavProvider>
      <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="SEPA-Lastschrift"
          subtitle="Mitgliedsbeiträge per SEPA-XML-Datei einziehen"
          actions={undefined}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Info */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200/30 bg-blue-500/5">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Erstellen Sie eine SEPA-Lastschrift-Datei (pain.008.003.02) zum Upload in Ihr Online-Banking.
                Mitglieder benötigen eine hinterlegte IBAN und einen Monatsbeitrag. Das SEPA-Mandat muss vorab
                vom Mitglied erteilt worden sein.
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-2xl border border-border bg-card/50 p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Mitglieder-Übersicht
              </h2>
              {isLoadingPreview ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Lade Mitglieder...
                </div>
              ) : preview ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-secondary/50 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{preview.total_members}</p>
                      <p className="text-xs text-muted-foreground">Aktive Mitglieder</p>
                    </div>
                    <div className="rounded-lg bg-success/10 p-3 text-center">
                      <p className="text-2xl font-bold text-success">{preview.ready_for_sepa}</p>
                      <p className="text-xs text-muted-foreground">Bereit für SEPA</p>
                    </div>
                    <div className="rounded-lg bg-warning/10 p-3 text-center">
                      <p className="text-2xl font-bold text-warning">{preview.total_members - preview.ready_for_sepa}</p>
                      <p className="text-xs text-muted-foreground">Fehlende Daten</p>
                    </div>
                  </div>

                  {readyMembers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-success" />
                        Bereit ({readyMembers.length})
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {readyMembers.map(m => (
                          <div key={m.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-success/5">
                            <span className="text-foreground">{m.name} {m.member_number ? `(#${m.member_number})` : ''}</span>
                            <span className="text-success font-medium">{m.beitrag_monthly?.toFixed(2)} €/Mon.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {missingMembers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-warning" />
                        Fehlende Daten ({missingMembers.length}) – nicht im Export enthalten
                      </p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {missingMembers.map(m => (
                          <div key={m.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-warning/5">
                            <span className="text-foreground">{m.name}</span>
                            <span className="text-warning">
                              {!m.has_iban && 'Keine IBAN'}
                              {!m.has_iban && !m.has_beitrag && ' · '}
                              {!m.has_beitrag && 'Kein Beitrag'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Daten verfügbar.</p>
              )}
            </div>

            {/* Export Form */}
            <form onSubmit={handleExport} className="rounded-2xl border border-border bg-card/50 p-6 space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                SEPA-Export generieren
              </h2>

              <div>
                <label className={labelClass}>Einzugsdatum *</label>
                <input
                  type="date"
                  value={form.collection_date}
                  onChange={e => setForm({ ...form, collection_date: e.target.value })}
                  required
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground mt-1">Datum des Lastschrifteinzugs (mind. 2 Bankarbeitstage im Voraus)</p>
              </div>

              <div>
                <label className={labelClass}>Gläubiger-IBAN (Vereinskonto) *</label>
                <input
                  type="text"
                  value={form.creditor_iban}
                  onChange={e => setForm({ ...form, creditor_iban: e.target.value.toUpperCase() })}
                  required
                  placeholder="DE89370400440532013000"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>BIC der Vereinsbank *</label>
                  <input
                    type="text"
                    value={form.creditor_bic}
                    onChange={e => setForm({ ...form, creditor_bic: e.target.value.toUpperCase() })}
                    required
                    placeholder="COBADEFFXXX"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>SEPA-Gläubiger-ID *</label>
                  <input
                    type="text"
                    value={form.creditor_id}
                    onChange={e => setForm({ ...form, creditor_id: e.target.value })}
                    required
                    placeholder="DE98ZZZ09999999999"
                    className={inputClass}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Von Ihrer Bank oder der Bundesbank</p>
                </div>
              </div>

              {exportError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {exportError}
                </div>
              )}

              <button
                type="submit"
                disabled={isExporting || (preview?.ready_for_sepa ?? 0) === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isExporting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Erstelle XML...</>
                ) : (
                  <><Download className="w-4 h-4" /> SEPA-XML herunterladen ({preview?.ready_for_sepa ?? 0} Mitglieder)</>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
    </MobileNavProvider>
  )
}

export default function SepaPage() {
  return (
    <AuthGuard>
      <SepaContent />
    </AuthGuard>
  )
}
