'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MemberForm } from '@/components/members/member-form'
import { PaymentRemindersPanel } from '@/components/members/payment-reminders-panel'
import { useMembers, useMemberStats } from '@/hooks/use-members'
import { membersApi } from '@/lib/api'
import { Member } from '@/lib/types'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import { CsvImportDialog } from '@/components/csv-import-dialog'
import { Users, Plus, Search, Mail, Phone, Edit2, Trash2, Crown, Bell, Upload } from 'lucide-react'

function MembersContent() {
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [reminderMember, setReminderMember] = useState<Member | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { members, isLoading, refetch } = useMembers({ search: search || undefined, status: statusFilter || undefined })
  const { stats } = useMemberStats()

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
    </div>
  )
}

export default function MembersPage() {
  return (
    <AuthGuard>
      <MembersContent />
    </AuthGuard>
  )
}
