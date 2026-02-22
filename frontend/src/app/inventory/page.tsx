'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { inventoryApi } from '@/lib/api'
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  ArrowRightLeft,
  MapPin,
  Tag,
  X,
  AlertCircle,
} from 'lucide-react'

interface InventoryItem {
  id: number
  user_id: number
  name: string
  description: string | null
  category: string | null
  quantity: number
  location: string | null
  status: string
  purchase_date: string | null
  purchase_price: number | null
  lent_to: string | null
  lent_since: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

const CATEGORIES = ['Sportgeräte', 'Technik', 'Mobiliar', 'Kleidung', 'Werkzeug', 'Sonstiges']

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: { label: 'Verfügbar', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  lent_out: { label: 'Ausgeliehen', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  maintenance: { label: 'Wartung', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  lost: { label: 'Verloren', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
}

const FILTER_OPTIONS = [
  { key: '', label: 'Alle' },
  { key: 'available', label: 'Verfügbar' },
  { key: 'lent_out', label: 'Ausgeliehen' },
  { key: 'maintenance', label: 'Wartung' },
]

const inputClass =
  'w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-sm font-medium text-foreground block mb-1.5'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ---------- Item Form Modal ----------

interface ItemModalProps {
  item?: InventoryItem | null
  onClose: () => void
  onSaved: () => void
}

function ItemModal({ item, onClose, onSaved }: ItemModalProps) {
  const isEdit = !!item
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1))
  const [location, setLocation] = useState(item?.location ?? '')
  const [status, setStatus] = useState(item?.status ?? 'available')
  const [purchaseDate, setPurchaseDate] = useState(item?.purchase_date ?? '')
  const [purchasePrice, setPurchasePrice] = useState(
    item?.purchase_price != null ? String(item.purchase_price) : ''
  )
  const [description, setDescription] = useState(item?.description ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) {
      setError('Name ist erforderlich.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        category: category || null,
        quantity: parseInt(quantity) || 1,
        location: location || null,
        status,
        purchase_date: purchaseDate || null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        description: description || null,
        notes: notes || null,
      }
      if (isEdit) {
        await inventoryApi.update(item!.id, payload)
      } else {
        await inventoryApi.create(payload)
      }
      onSaved()
    } catch {
      setError('Fehler beim Speichern. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? 'Artikel bearbeiten' : 'Neuer Artikel'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>Name *</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Fußball, Beamer, Tisch..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Kategorie</label>
              <select
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Keine Kategorie</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Anzahl</label>
              <input
                className={inputClass}
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Standort</label>
              <input
                className={inputClass}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="z.B. Geräteraum"
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="available">Verfügbar</option>
                <option value="lent_out">Ausgeliehen</option>
                <option value="maintenance">Wartung</option>
                <option value="lost">Verloren</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Kaufdatum</label>
              <input
                className={inputClass}
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Kaufpreis (€)</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Beschreibung</label>
            <textarea
              className={inputClass + ' resize-none'}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung..."
            />
          </div>

          <div>
            <label className={labelClass}>Notizen</label>
            <textarea
              className={inputClass + ' resize-none'}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interne Notizen..."
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Speichern...' : isEdit ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ---------- Lend Modal ----------

interface LendModalProps {
  item: InventoryItem
  onClose: () => void
  onSaved: () => void
}

function LendModal({ item, onClose, onSaved }: LendModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [lentTo, setLentTo] = useState(item.lent_to ?? '')
  const [lentSince, setLentSince] = useState(item.lent_since ?? today)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleLend() {
    if (!lentTo.trim()) {
      setError('Bitte angeben, an wen der Artikel ausgeliehen wird.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await inventoryApi.lend(item.id, { lent_to: lentTo.trim(), lent_since: lentSince })
      onSaved()
    } catch {
      setError('Fehler beim Speichern. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Artikel ausleihen</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Artikel: <span className="font-medium text-foreground">{item.name}</span>
          </p>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>Ausgeliehen an *</label>
            <input
              className={inputClass}
              value={lentTo}
              onChange={(e) => setLentTo(e.target.value)}
              placeholder="Name des Mitglieds oder Person..."
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Ausgeliehen seit</label>
            <input
              className={inputClass}
              type="date"
              value={lentSince}
              onChange={(e) => setLentSince(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleLend}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Speichern...' : 'Ausleihen'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ---------- Delete Confirm Modal ----------

interface DeleteModalProps {
  item: InventoryItem
  onClose: () => void
  onDeleted: () => void
}

function DeleteModal({ item, onClose, onDeleted }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await inventoryApi.delete(item.id)
      onDeleted()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm"
      >
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-foreground mb-2">Artikel löschen?</h2>
          <p className="text-sm text-muted-foreground">
            Soll <span className="font-medium text-foreground">{item.name}</span> dauerhaft gelöscht werden?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Löschen...' : 'Löschen'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ---------- Item Card ----------

interface ItemCardProps {
  item: InventoryItem
  onEdit: (item: InventoryItem) => void
  onLend: (item: InventoryItem) => void
  onReturn: (item: InventoryItem) => void
  onDelete: (item: InventoryItem) => void
}

function ItemCard({ item, onEdit, onLend, onReturn, onDelete }: ItemCardProps) {
  const statusConfig = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.available
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover action buttons */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-3 flex items-center gap-1"
          >
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Bearbeiten"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => item.status === 'lent_out' ? onReturn(item) : onLend(item)}
              className="p-1.5 rounded-lg bg-secondary/80 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 transition-colors"
              title={item.status === 'lent_out' ? 'Zurückgegeben' : 'Ausleihen'}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(item)}
              className="p-1.5 rounded-lg bg-secondary/80 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header row */}
      <div className="flex items-start gap-3 mb-3 pr-20">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm truncate">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.className}`}
        >
          {statusConfig.label}
        </span>
        {item.category && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border">
            <Tag className="w-3 h-3" />
            {item.category}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        {item.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Anzahl: <span className="font-medium text-foreground">{item.quantity}</span></span>
          {item.purchase_price != null && (
            <span>
              {item.purchase_price.toLocaleString('de-DE', {
                style: 'currency',
                currency: 'EUR',
              })}
            </span>
          )}
        </div>
        {item.status === 'lent_out' && item.lent_to && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
            <span className="text-amber-700 dark:text-amber-500 font-medium">
              Ausgeliehen an: {item.lent_to}
            </span>
            {item.lent_since && (
              <span className="text-muted-foreground ml-1">seit {formatDate(item.lent_since)}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---------- Main Page ----------

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showItemModal, setShowItemModal] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [lendItem, setLendItem] = useState<InventoryItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null)

  async function loadItems() {
    setLoading(true)
    try {
      const res = await inventoryApi.list(filter || undefined)
      setItems(res.data)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function handleReturn(item: InventoryItem) {
    try {
      await inventoryApi.returnItem(item.id)
      loadItems()
    } catch {
      // silent fail
    }
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const lentOutCount = items.filter((i) => i.status === 'lent_out').length
  const availableCount = items.filter((i) => i.status === 'available').length

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            title="Inventar"
            subtitle="Vereinseigentum verwalten und Ausleihe tracken"
            actions={
              <button
                onClick={() => {
                  setEditItem(null)
                  setShowItemModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Neuer Artikel
              </button>
            }
          />

          <main className="flex-1 overflow-y-auto px-6 py-6">
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Artikel gesamt</p>
                <p className="text-2xl font-bold text-foreground">{totalItems}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Verfügbar</p>
                <p className="text-2xl font-bold text-green-600">{availableCount}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Ausgeliehen</p>
                <p className="text-2xl font-bold text-amber-500">{lentOutCount}</p>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    filter === opt.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Items grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-card border border-border rounded-xl p-5 animate-pulse h-40"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Kein Inventar vorhanden</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">
                  {filter
                    ? 'Keine Artikel mit diesem Status gefunden.'
                    : 'Füge deinen ersten Artikel hinzu, um das Inventar zu verwalten.'}
                </p>
                {!filter && (
                  <button
                    onClick={() => {
                      setEditItem(null)
                      setShowItemModal(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ersten Artikel hinzufügen
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={(i) => {
                        setEditItem(i)
                        setShowItemModal(true)
                      }}
                      onLend={(i) => setLendItem(i)}
                      onReturn={handleReturn}
                      onDelete={(i) => setDeleteItem(i)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showItemModal && (
          <ItemModal
            item={editItem}
            onClose={() => {
              setShowItemModal(false)
              setEditItem(null)
            }}
            onSaved={() => {
              setShowItemModal(false)
              setEditItem(null)
              loadItems()
            }}
          />
        )}
        {lendItem && (
          <LendModal
            item={lendItem}
            onClose={() => setLendItem(null)}
            onSaved={() => {
              setLendItem(null)
              loadItems()
            }}
          />
        )}
        {deleteItem && (
          <DeleteModal
            item={deleteItem}
            onClose={() => setDeleteItem(null)}
            onDeleted={() => {
              setDeleteItem(null)
              loadItems()
            }}
          />
        )}
      </AnimatePresence>
    </AuthGuard>
  )
}
