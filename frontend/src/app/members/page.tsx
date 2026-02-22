'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { Header } from '@/components/layout/header'
import { MemberForm } from '@/components/members/member-form'
import { PaymentRemindersPanel } from '@/components/members/payment-reminders-panel'
import { useMembers, useMemberStats } from '@/hooks/use-members'
import { membersApi, donationsApi, portalApi } from '@/lib/api'
import { Member } from '@/lib/types'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import { CsvImportDialog } from '@/components/csv-import-dialog'
import { Users, Plus, Search, Mail, Phone, Edit2, Trash2, Crown, Bell, Upload, FileCheck, Loader2, Link, Copy, Check, X } from 'lucide-react'

function MembersContent() {
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [reminderMember, setReminderMember] = useState<Member | null>(null)
  const [receiptMember, setReceiptMember] = useState<Member | null>(null)
  const [receiptYear, setReceiptYear] = useState(new Date().getFullYear() - 1)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { members, isLoading, refetch } = useMembers({ search: search || undefined, status: statusFilter || undefined })
  const { stats } = useMemberStats()

  // Portal token state
  const [portalMember, setPortalMember] = useState<Member | null>(null)
  const [portalLink, setPortalLink] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalCopied, setPortalCopied] = useState(false)

  const handleGeneratePortalLink = async (member: Member) => {
    setPortalMember(member)
    setPortalLink(null)
    setPortalCopied(false)
    setPortalLoading(true)
    try {
      const res = await portalApi.generateToken(member.id)
      const token: string = res.data.token
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      setPortalLink(`${origin}/portal/${token}`)
    } catch {
      setPortalLink(null)
    } finally {
      setPortalLoading(false)
    }
  }

  const handleCopyPortalLink = () => {
    if (!portalLink) return
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(portalLink).then(() => {
        setPortalCopied(true)
        setTimeout(() => setPortalCopied(false), 2000)
      })
    } else {
      // Fallback for HTTP (non-secure context)
      const el = document.createElement('textarea')
      el.value = portalLink
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setPortalCopied(true)
      setTimeout(() => setPortalCopied(false), 2000)
    }
  }

  const handleDownloadReceipt = async () => {
    if (!receiptMember) return
    setReceiptLoading(true)
    setReceiptError('')
    try {
      const res = await donationsApi.downloadReceipt(receiptMember.id, receiptYear)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zuwendungsbestaetigung_${receiptMember.last_name}_${receiptYear}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setReceiptMember(null)
    } catch (e: unknown) {
      // When responseType is 'blob', error responses are also blobs - parse them as text
      const errData = (e as { response?: { data?: Blob | { detail?: string } } })?.response?.data
      let msg = 'Fehler beim Erstellen der Bestätigung'
      if (errData instanceof Blob) {
        try {
          const text = await errData.text()
          const json = JSON.parse(text)
          msg = json.detail || msg
        } catch { /* keep default msg */ }
      } else if (errData && typeof errData === 'object' && 'detail' in errData) {
        msg = (errData as { detail: string }).detail || msg
      }
      setReceiptError(msg)
    } finally {
      setReceiptLoading(false)
    }
  }

  const handleCreate = async (data: Record<string, unknown>) => {
    await membersApi.create(data)
    refetch()
  }

  const handleImportMembers = async (file: File) => {
    const res = await membersApi.importCsv(file)
    refetch()
    return res.data
  }

  const handleDownloadMemberTemplate = async () => {
    const res = await membersApi.downloadTemplate()
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = 'mitglieder_vorlage.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (editMember) {
      await membersApi.update(editMember.id, data)
      refetch()
    }
  }

  const handleDelete = async (member: Member) => {
    if (confirm(`Mitglied "${member.first_name} ${member.last_name}" wirklich löschen?`)) {
      await membersApi.delete(member.id)
      refetch()
    }
  }

  return (
    <MobileNavProvider>
      <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Mitgliederverwaltung"
          subtitle={stats ? `${stats.active} aktive Mitglieder${stats.limit ? ` / ${stats.limit} max.` : ''}` : ''}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors"
              >
                <Upload className="w-4 h-4" />
                CSV-Import
              </button>
              <button
                onClick={() => { setEditMember(null); setShowForm(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Mitglied hinzufügen
              </button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Premium limit banner */}
          {stats && stats.limit && stats.total >= stats.limit && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-warning/10 border border-warning/20"
            >
              <Crown className="w-5 h-5 text-warning flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Mitgliederlimit erreicht</p>
                <p className="text-xs text-muted-foreground">
                  Upgraden Sie auf Premium für unlimitierte Mitglieder (0,99€/Monat)
                </p>
              </div>
            </motion.div>
          )}

          {/* Search & Filter */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mitglieder suchen..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="suspended">Gesperrt</option>
            </select>
          </div>

          {/* Members list */}
          {isLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-secondary/30 animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Keine Mitglieder</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search ? 'Keine Mitglieder gefunden' : 'Fügen Sie Ihr erstes Mitglied hinzu'}
              </p>
              {!search && (
                <button
                  onClick={() => { setEditMember(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Erstes Mitglied anlegen
                </button>
              )}
            </motion.div>
          ) : (
            <div className="grid gap-3">
              {members.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/80 hover:bg-card transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {member.first_name[0]}{member.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{member.first_name} {member.last_name}</p>
                        {member.member_number && (
                          <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                            #{member.member_number}
                          </span>
                        )}
                        <span className={`text-xs font-medium ${getStatusColor(member.status)}`}>
                          {getStatusLabel(member.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {member.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" /> {member.email}
                          </span>
                        )}
                        {member.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" /> {member.phone}
                          </span>
                        )}
                        {member.member_since && (
                          <span className="text-xs text-muted-foreground">
                            Seit {formatDate(member.member_since)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {member.beitrag_monthly && (
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(member.beitrag_monthly)}
                        </p>
                        <p className="text-xs text-muted-foreground">/ Monat</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleGeneratePortalLink(member)}
                        title="Portal-Link generieren"
                        className="p-1.5 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors"
                      >
                        <Link className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setReceiptMember(member); setReceiptError('') }}
                        title="Zuwendungsbestätigung"
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors"
                      >
                        <FileCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setReminderMember(member)}
                        title="Beitragsverfolgung"
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition-colors"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditMember(member); setShowForm(true) }}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {showForm && (
        <MemberForm
          member={editMember}
          onSubmit={editMember ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditMember(null) }}
        />
      )}

      {reminderMember && (
        <PaymentRemindersPanel
          member={reminderMember}
          onClose={() => setReminderMember(null)}
        />
      )}

      {showImport && (
        <CsvImportDialog
          title="Mitglieder importieren"
          description="Importieren Sie Mitglieder aus einer CSV-Datei. Laden Sie zuerst die Vorlage herunter, um das korrekte Format zu sehen."
          templateFilename="mitglieder_vorlage.csv"
          onClose={() => { setShowImport(false); refetch() }}
          onImport={handleImportMembers}
          onDownloadTemplate={handleDownloadMemberTemplate}
        />
      )}

      {/* Portal Link Modal */}
      {portalMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Link className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Portal-Zugangslink</h3>
                <p className="text-xs text-muted-foreground">
                  {portalMember.first_name} {portalMember.last_name}
                </p>
              </div>
              <button
                onClick={() => { setPortalMember(null); setPortalLink(null) }}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Dieser Link ermöglicht dem Mitglied den schreibgeschützten Zugriff auf seine eigenen Daten,
              Zahlungshistorie, Veranstaltungen und Vereinsdokumente — ohne Login.
            </p>

            {portalLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : portalLink ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 border border-border">
                  <p className="flex-1 text-xs text-foreground font-mono break-all">{portalLink}</p>
                  <button
                    onClick={handleCopyPortalLink}
                    title="Link kopieren"
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    {portalCopied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hinweis: Ein neuer Link macht alle vorherigen Links ungültig.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setPortalMember(null); setPortalLink(null) }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Schließen
                  </button>
                  <button
                    onClick={handleCopyPortalLink}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
                  >
                    {portalCopied ? (
                      <><Check className="w-4 h-4" /> Kopiert!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Link kopieren</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-destructive">
                Fehler beim Generieren des Links. Bitte erneut versuchen.
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Zuwendungsbestätigung Dialog */}
      {receiptMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Zuwendungsbestätigung</h3>
                <p className="text-xs text-muted-foreground">
                  {receiptMember.first_name} {receiptMember.last_name}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Erstellt eine Zuwendungsbestätigung nach amtlichem Muster (§ 10b EStG) für alle
              Mitgliedsbeiträge und Spenden des Mitglieds im gewählten Kalenderjahr.
            </p>

            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Abrechnungsjahr
              </label>
              <select
                value={receiptYear}
                onChange={(e) => setReceiptYear(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {receiptError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{receiptError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setReceiptMember(null); setReceiptError('') }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDownloadReceipt}
                disabled={receiptLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-60 transition-colors"
              >
                {receiptLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Wird erstellt...</>
                ) : (
                  <><FileCheck className="w-4 h-4" /> PDF herunterladen</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
    </MobileNavProvider>
  )
}

export default function MembersPage() {
  return (
    <AuthGuard>
      <MembersContent />
    </AuthGuard>
  )
}
