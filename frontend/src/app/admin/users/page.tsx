'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { Header } from '@/components/layout/header'
import { adminApi } from '@/lib/api'
import { User } from '@/lib/types'
import { formatDate, getStatusLabel } from '@/lib/utils'
import { Users, Search, Crown, Shield, Trash2, Edit2, X, Check } from 'lucide-react'

function AdminUsersContent() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editData, setEditData] = useState({
    role: '',
    is_active: true,
    subscription_tier: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await adminApi.listUsers(search || undefined)
      setUsers(response.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [search])

  const openEdit = (user: User) => {
    setEditUser(user)
    setEditData({
      role: user.role,
      is_active: user.is_active,
      subscription_tier: user.subscription_tier,
    })
  }

  const handleSave = async () => {
    if (!editUser) return
    setIsSaving(true)
    try {
      await adminApi.updateUser(editUser.id, editData)
      await loadUsers()
      setEditUser(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (confirm(`Benutzer "${user.name}" wirklich löschen?`)) {
      await adminApi.deleteUser(user.id)
      await loadUsers()
    }
  }

  return (
    <MobileNavProvider>
      <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Benutzerverwaltung" subtitle={`${users.length} Benutzer`} />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Benutzer suchen..."
              className="w-full max-w-sm pl-10 pr-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
              <div className="grid grid-cols-[1fr_180px_120px_100px_100px_80px] gap-4 px-5 py-3 text-xs font-medium text-muted-foreground border-b border-border">
                <div>Benutzer</div>
                <div>Organisation</div>
                <div>Abo</div>
                <div>Rolle</div>
                <div>Erstellt</div>
                <div />
              </div>
              {users.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[1fr_180px_120px_100px_100px_80px] gap-4 items-center px-5 py-3.5 border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {user.organization_name || '-'}
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                      user.subscription_tier === 'premium'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {user.subscription_tier === 'premium' && <Crown className="w-3 h-3" />}
                      {user.subscription_tier === 'premium' ? 'Premium' : 'Kostenlos'}
                    </span>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                      user.role === 'admin'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {user.role === 'admin' && <Shield className="w-3 h-3" />}
                      {user.role === 'admin' ? 'Admin' : 'Nutzer'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDate(user.created_at)}</div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditUser(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Benutzer bearbeiten</h2>
              <button onClick={() => setEditUser(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="font-medium text-foreground">{editUser.name}</p>
              <p className="text-sm text-muted-foreground">{editUser.email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Rolle</label>
                <select
                  value={editData.role}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="member">Benutzer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Abonnement</label>
                <select
                  value={editData.subscription_tier}
                  onChange={(e) => setEditData({ ...editData, subscription_tier: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="free">Kostenlos</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <span className="text-sm text-foreground">Konto aktiv</span>
                <button
                  type="button"
                  onClick={() => setEditData({ ...editData, is_active: !editData.is_active })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${editData.is_active ? 'bg-primary' : 'bg-secondary'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${editData.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {isSaving ? 'Speichern...' : <><Check className="w-4 h-4" /> Speichern</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
    </MobileNavProvider>
  )
}

export default function AdminUsersPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminUsersContent />
    </AuthGuard>
  )
}
