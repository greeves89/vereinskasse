'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { documentsApi } from '@/lib/api'
import {
  Cloud,
  Upload,
  Trash2,
  Download,
  FileText,
  File,
  Image,
  Table,
  X,
  Edit2,
  Filter,
} from 'lucide-react'

interface VereinsDoc {
  id: number
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  title?: string
  description?: string
  category: string
  created_at: string
}

const CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: 'satzung', label: 'Satzung', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { key: 'protokoll', label: 'Protokoll', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { key: 'formular', label: 'Formular', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { key: 'finanzen', label: 'Finanzen', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { key: 'sonstiges', label: 'Sonstiges', color: 'bg-secondary text-muted-foreground border-border' },
]

function getCategoryColor(key: string): string {
  return CATEGORIES.find(c => c.key === key)?.color || CATEGORIES[4].color
}

function getCategoryLabel(key: string): string {
  return CATEGORIES.find(c => c.key === key)?.label || key
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith('image/')) return <Image className={className} />
  if (mimeType.includes('pdf')) return <FileText className={className} />
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return <Table className={className} />
  return <File className={className} />
}

const inputClass = 'w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-sm font-medium text-foreground block mb-1.5'

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('sonstiges')
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    try {
      await documentsApi.upload(file, title || undefined, description || undefined, category)
      onUploaded()
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Dokument hochladen</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' :
              file ? 'border-primary/40 bg-primary/5' :
              'border-border hover:border-primary/40 hover:bg-secondary/30'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <>
                <FileIcon mimeType={file.type} className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-foreground font-medium">Datei hierher ziehen oder klicken</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, Bilder, Text – max. 10 MB</p>
              </>
            )}
          </div>

          <div>
            <label className={labelClass}>Titel</label>
            <input type="text" value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Dokumententitel" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Kategorie</label>
            <select value={category}
              onChange={e => setCategory(e.target.value)}
              className={inputClass}>
              {CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Beschreibung (optional)</label>
            <textarea value={description} rows={2}
              onChange={e => setDescription(e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Kurze Beschreibung des Dokuments" />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
              Abbrechen
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isUploading ? 'Hochladen...' : 'Hochladen'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function VereinscloudContent() {
  const [docs, setDocs] = useState<VereinsDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const loadDocs = async () => {
    setIsLoading(true)
    try {
      const res = await documentsApi.list(filterCategory || undefined)
      setDocs(res.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadDocs() }, [filterCategory])

  const handleDelete = async (doc: VereinsDoc) => {
    if (confirm(`Dokument "${doc.title || doc.original_filename}" löschen?`)) {
      await documentsApi.delete(doc.id)
      setDocs(prev => prev.filter(d => d.id !== doc.id))
    }
  }

  const handleSaveTitle = async (id: number) => {
    await documentsApi.update(id, { title: editTitle })
    setDocs(prev => prev.map(d => d.id === id ? { ...d, title: editTitle } : d))
    setEditId(null)
  }

  const totalSize = docs.reduce((sum, d) => sum + d.file_size, 0)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Vereinscloud"
          subtitle="Satzungen, Protokolle und Dokumente für Ihren Verein verwalten"
          actions={
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Hochladen
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{docs.length}</p>
              <p className="text-xs text-muted-foreground">Dokumente</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{formatFileSize(totalSize)}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {CATEGORIES.filter(c => docs.some(d => d.category === c.key)).length}
              </p>
              <p className="text-xs text-muted-foreground">Kategorien</p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2 mb-5 flex-wrap">
            <button
              onClick={() => setFilterCategory('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterCategory === '' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Alle
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setFilterCategory(cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterCategory === cat.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Cloud className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-foreground mb-1">Keine Dokumente</p>
              <p className="text-sm text-muted-foreground mb-4">
                Laden Sie Satzungen, Protokolle und andere Vereinsdokumente hoch
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Erstes Dokument hochladen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {docs.map((doc, idx) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-xl border border-border bg-card p-4 group hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileIcon mimeType={doc.mime_type} className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editId === doc.id ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="flex-1 text-sm px-2 py-0.5 rounded border border-border bg-background"
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(doc.id); if (e.key === 'Escape') setEditId(null) }}
                            autoFocus
                          />
                          <button onClick={() => handleSaveTitle(doc.id)} className="text-xs text-primary px-1">✓</button>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-foreground truncate">{doc.title || doc.original_filename}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">{doc.original_filename}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getCategoryColor(doc.category)}`}>
                        {getCategoryLabel(doc.category)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditId(doc.id); setEditTitle(doc.title || doc.original_filename) }}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <a
                        href={documentsApi.getDownloadUrl(doc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {doc.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{doc.description}</p>
                  )}

                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(doc.created_at).toLocaleDateString('de-DE')}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); loadDocs() }}
        />
      )}
    </div>
  )
}

export default function VereinscloudPage() {
  return (
    <AuthGuard>
      <VereinscloudContent />
    </AuthGuard>
  )
}
