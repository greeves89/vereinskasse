'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { portalApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  User,
  CreditCard,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  MapPin,
  Hash,
} from 'lucide-react'

interface PortalMember {
  member_id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  member_since: string | null
  member_number: string | null
  status: string
  beitrag_monthly: number | null
  organization_name: string | null
}

interface PortalTransaction {
  transaction_date: string
  description: string
  amount: number
  type: string
}

interface PortalEvent {
  id: number
  title: string
  event_date: string
  location: string | null
  description: string | null
}

interface PortalDocument {
  id: number
  title: string | null
  original_filename: string
  category: string
  file_size: number
  created_at: string
}

interface PortalData {
  member: PortalMember
  transactions: PortalTransaction[]
  events: PortalEvent[]
  documents: PortalDocument[]
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Aktiv',
    inactive: 'Inaktiv',
    suspended: 'Gesperrt',
  }
  return map[status] ?? status
}

function statusClasses(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    suspended: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    satzung: 'Satzung',
    protokoll: 'Protokoll',
    formular: 'Formular',
    finanzen: 'Finanzen',
    sonstiges: 'Sonstiges',
  }
  return map[category] ?? category
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function PortalPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    portalApi
      .getData(token)
      .then((res) => {
        setData(res.data)
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail
        if (err?.response?.status === 404) {
          setError('Ungültiger Zugangslink. Bitte fordern Sie einen neuen Link beim Verein an.')
        } else {
          setError(detail || 'Ein unerwarteter Fehler ist aufgetreten.')
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Daten werden geladen...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Zugang nicht möglich</h2>
          <p className="text-sm text-slate-500">{error}</p>
          <p className="mt-4 text-xs text-slate-400">Powered by VereinsKasse</p>
        </div>
      </div>
    )
  }

  const { member, transactions, events, documents } = data

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-5">
          {member.organization_name && (
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">
              {member.organization_name}
            </p>
          )}
          <h1 className="text-xl font-bold text-slate-800">Mein Mitgliederportal</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Member Info Card */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-blue-600">
                {member.first_name[0]}{member.last_name[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-slate-800">
                  {member.first_name} {member.last_name}
                </h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClasses(member.status)}`}>
                  {statusLabel(member.status)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                {member.member_number && (
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" />
                    Mitglied #{member.member_number}
                  </span>
                )}
                {member.member_since && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    Mitglied seit {formatDate(member.member_since)}
                  </span>
                )}
                {member.email && (
                  <span className="flex items-center gap-1">
                    {member.email}
                  </span>
                )}
                {member.phone && (
                  <span className="flex items-center gap-1">
                    {member.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {member.beitrag_monthly != null && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CreditCard className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Monatlicher Beitrag</p>
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(member.beitrag_monthly)}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Transactions */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Zahlungshistorie</h3>
            <span className="ml-auto text-xs text-slate-400">{transactions.length} Einträge</span>
          </div>

          {transactions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              Keine Zahlungen vorhanden
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {transactions.map((tx, i) => {
                const isIncome = tx.type === 'income'
                return (
                  <li key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isIncome ? 'bg-emerald-50' : 'bg-red-50'
                    }`}>
                      {isIncome
                        ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{tx.description}</p>
                      <p className="text-xs text-slate-400">{formatDate(tx.transaction_date)}</p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${
                      isIncome ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {isIncome ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Upcoming Events */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-violet-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Nächste Veranstaltungen</h3>
          </div>

          {events.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              Keine bevorstehenden Veranstaltungen
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {events.map((event) => (
                <li key={event.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                      <p className="text-xs text-violet-600 font-medium mt-0.5">
                        {formatEventDate(event.event_date)}
                      </p>
                      {event.location && (
                        <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Documents */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Vereinsdokumente</h3>
          </div>

          {documents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              Keine Dokumente vorhanden
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {doc.title || doc.original_filename}
                    </p>
                    <p className="text-xs text-slate-400">
                      {categoryLabel(doc.category)} · {formatFileSize(doc.file_size)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 hidden sm:block flex-shrink-0">
                    {formatDate(doc.created_at.slice(0, 10))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 py-6 text-center">
        <p className="text-xs text-slate-400">Powered by VereinsKasse</p>
      </footer>
    </div>
  )
}
