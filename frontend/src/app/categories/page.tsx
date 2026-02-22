'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { Header } from '@/components/layout/header'
import { categoriesApi } from '@/lib/api'
import { Category } from '@/lib/types'
import { Tag, Plus, Edit2, Trash2, X, Check } from 'lucide-react'

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6b7280', '#06b6d4',
]

function CategoriesContent() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ name: '', type: 'income', color: '#3b82f6' })
  const [isSaving, setIsSaving] = useState(false)

  const loadCategories = async () => {
    setIsLoading(true)
    try {
      const response = await categoriesApi.list()
      setCategories(response.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const openForm = (category?: Category) => {
    if (category) {
      setEditCategory(category)
      setFormData({ name: category.name, type: category.type, color: category.color })
    } else {
      setEditCategory(null)
      setFormData({ name: '', type: 'income', color: '#3b82f6' })
    }
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (editCategory) {
        await categoriesApi.update(editCategory.id, formData)
      } else {
        await categoriesApi.create(formData)
      }
      await loadCategories()
      setShowForm(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (cat: Category) => {
    if (confirm(`Kategorie "${cat.name}" löschen?`)) {
      await categoriesApi.delete(cat.id)
      await loadCategories()
    }
  }

  const incomeCategories = categories.filter((c) => c.type === 'income')
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  return (
    <MobileNavProvider>
      <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Kategorien"
          subtitle="Einnahmen und Ausgaben kategorisieren"
          actions={
            <button
              onClick={() => openForm()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Kategorie anlegen
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income categories */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  Einnahmen ({incomeCategories.length})
                </h2>
                <div className="space-y-2">
                  {incomeCategories.map((cat, i) => (
                    <motion.div
                      key={cat.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/80 hover:bg-card transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white/20"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openForm(cat)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  {incomeCategories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Keine Einnahmen-Kategorien
                    </div>
                  )}
                </div>
              </div>

              {/* Expense categories */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  Ausgaben ({expenseCategories.length})
                </h2>
                <div className="space-y-2">
                  {expenseCategories.map((cat, i) => (
                    <motion.div
                      key={cat.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/80 hover:bg-card transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white/20"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openForm(cat)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  {expenseCategories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Keine Ausgaben-Kategorien
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">{editCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Typ</label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-secondary/50">
                  {[{ value: 'income', label: 'Einnahme' }, { value: 'expense', label: 'Ausgabe' }].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t.value })}
                      className={`py-2 rounded-md text-sm font-medium transition-colors ${
                        formData.type === t.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Farbe</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
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
                  {isSaving ? 'Speichern...' : editCategory ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
    </MobileNavProvider>
  )
}

export default function CategoriesPage() {
  return (
    <AuthGuard>
      <CategoriesContent />
    </AuthGuard>
  )
}
