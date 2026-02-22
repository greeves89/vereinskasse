'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import api from '@/lib/api'
import { Layers, Plus, Edit2, Trash2, X, Users, Check } from 'lucide-react'

interface Group {
  id: number
  name: string
  description?: string
  beitrag_override?: number
  color?: string
  member_count: number
  created_at: string
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6b7280', '#06b6d4',
]

const inputClass = 'w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-sm font-medium text-foreground block mb-1.5'

function GroupsContent() {
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    beitrag_override: '',
    color: '#3b82f6',
  })

  const loadGroups = async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/member-groups')
      setGroups(res.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])

  const openForm = (group?: Group) => {
    if (group) {
      setEditGroup(group)
      setFormData({
        name: group.name,
        description: group.description || '',
        beitrag_override: group.beitrag_override ? String(group.beitrag_override) : '',
        color: group.color || '#3b82f6',
      })
    } else {
      setEditGroup(null)
      setFormData({ name: '', description: '', beitrag_override: '', color: '#3b82f6' })
    }
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const data = {
        name: formData.name,
        description: formData.description || null,
        beitrag_override: formData.beitrag_override ? parseFloat(formData.beitrag_override) : null,
        color: formData.color,
      }
      if (editGroup) {
        await api.put(`/member-groups/${editGroup.id}`, data)
      } else {
        await api.post('/member-groups', data)
      }
      await loadGroups()
      setShowForm(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (group: Group) => {
    if (confirm(`Gruppe "${group.name}" löschen? Mitglieder werden keiner Gruppe zugewiesen.`)) {
      await api.delete(`/member-groups/${group.id}`)
      setGroups(prev => prev.filter(g => g.id !== group.id))
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Mitgliedergruppen"
          subtitle="Mitglieder in Abteilungen und Gruppen mit unterschiedlichen Beiträgen einteilen"
          actions={
            <button
              onClick={() => openForm()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Gruppe anlegen
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Layers className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-foreground mb-1">Keine Gruppen vorhanden</p>
              <p className="text-sm text-muted-foreground mb-4">
                Erstellen Sie Gruppen für Jugend, Senioren, verschiedene Abteilungen mit eigenen Beitragssätzen
              </p>
              <button
                onClick={() => openForm()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Erste Gruppe anlegen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {groups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl border border-border bg-card/80 p-5 hover:bg-card transition-colors group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: group.color || '#3b82f6' }}
                      >
                        {group.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openForm(group)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(group)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      {group.member_count} Mitglied{group.member_count !== 1 ? 'er' : ''}
                    </span>
                    {group.beitrag_override != null ? (
                      <span
                        className="px-2 py-0.5 rounded-full font-medium text-white"
                        style={{ backgroundColor: group.color || '#3b82f6' }}
                      >
                        {group.beitrag_override.toFixed(2)} €/Mon.
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Kein Sonderbeitrag</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{editGroup ? 'Gruppe bearbeiten' : 'Neue Gruppe'}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Gruppenname *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="z.B. Jugend, Senioren, Fußball"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className={labelClass}>Monatsbeitrag (optional, überschreibt individuellen Beitrag)</label>
                <input
                  type="number"
                  value={formData.beitrag_override}
                  onChange={e => setFormData({ ...formData, beitrag_override: e.target.value })}
                  min="0"
                  step="0.01"
                  placeholder="z.B. 5.00 für ermäßigten Jugendtarif"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Farbe</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: color, borderColor: formData.color === color ? 'white' : 'transparent' }}
                    >
                      {formData.color === color && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSaving ? 'Speichern...' : editGroup ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default function GroupsPage() {
  return (
    <AuthGuard>
      <GroupsContent />
    </AuthGuard>
  )
}
