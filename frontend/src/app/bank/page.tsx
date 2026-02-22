'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Landmark,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Users,
  Info,
  TrendingUp,
  TrendingDown,
  X,
  BookOpen,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { Header } from '@/components/layout/header'
import { AuthGuard } from '@/components/auth/auth-guard'
import { bankApi } from '@/lib/api'

interface BankTxn {
  booking_date: string
  counterparty: string | null
  iban: string | null
  purpose: string | null
  amount: number
  currency: string
  matched_member_id: number | null
  matched_member_name: string | null
  match_type: string | null
  transaction_created: boolean
}

interface ImportResult {
  imported: number
  member_matches: number
  kassenbuch_added: number
  skipped: number
  transactions: BankTxn[]
}

function fmtEuro(val: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val)
}

export default function BankPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [addToKassenbuch, setAddToKassenbuch] = useState(false)
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setError('')
    setResult(null)
    try {
      const res = await bankApi.import(file, addToKassenbuch)
      setResult(res.data as ImportResult)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Fehler beim Import. Bitte CSV-Format prüfen.')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const displayedTxns = result?.transactions.filter((t) => {
    if (filter === 'matched') return !!t.matched_member_id
    if (filter === 'unmatched') return !t.matched_member_id
    return true
  }) ?? []

  return (
    <AuthGuard>
      <MobileNavProvider>
        <div className="flex h-screen bg-background">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header
            title="Bankabgleich"
            subtitle="Kontoauszug importieren & Zahlungen Mitgliedern zuordnen"
            actions={
              <button
                onClick={() => fileRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {importing ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {importing ? 'Importiert…' : 'CSV importieren'}
              </button>
            }
          />
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />

          <main className="flex-1 overflow-y-auto p-6">

            {/* Options */}
            {!result && (
              <div className="max-w-2xl space-y-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-primary" />
                    Kontoauszug importieren
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Exportiere deinen Kontoauszug als CSV aus deinem Online-Banking und importiere ihn hier.
                    VereinsKasse erkennt automatisch Mitgliedsbeiträge anhand der IBAN oder des Namens im Verwendungszweck.
                  </p>

                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={addToKassenbuch}
                      onChange={(e) => setAddToKassenbuch(e.target.checked)}
                      className="w-4 h-4 rounded border-border accent-primary"
                    />
                    <span className="text-sm text-foreground">
                      Einnahmen direkt ins Kassenbuch übernehmen
                    </span>
                  </label>

                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4" />
                    CSV-Datei auswählen
                  </button>
                </div>

                <div className="p-4 bg-muted rounded-xl text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Unterstützte Formate:</p>
                  <ul className="space-y-1">
                    <li>• DKB Girokonto-Export (CSV)</li>
                    <li>• Sparkasse / VR-Bank (CSV)</li>
                    <li>• Comdirect (CSV)</li>
                    <li>• Die meisten deutschen Banken mit CSV-Export</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 max-w-2xl"
                >
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400 flex-1">{error}</p>
                  <button onClick={() => setError('')} className="p-1 hover:bg-red-500/20 rounded">
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results */}
            {result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                {/* Summary stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Buchungen', value: result.imported, icon: Landmark },
                    { label: 'Mitglieder erkannt', value: result.member_matches, icon: Users },
                    { label: 'Kassenbuch-Einträge', value: result.kassenbuch_added, icon: BookOpen },
                    { label: 'Übersprungen', value: result.skipped, icon: Info },
                  ].map((s) => (
                    <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <s.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 mb-4">
                  {(['all', 'matched', 'unmatched'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        filter === f
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {f === 'all' ? 'Alle' : f === 'matched' ? 'Mitglied erkannt' : 'Nicht erkannt'}
                    </button>
                  ))}
                  <button
                    onClick={() => { setResult(null); setError(''); }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Neuer Import
                  </button>
                </div>

                {/* Transaction list */}
                <div className="space-y-2">
                  {displayedTxns.map((txn, idx) => {
                    const isIncome = txn.amount > 0
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="bg-card border border-border rounded-xl p-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                            isIncome ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}>
                            {isIncome
                              ? <TrendingUp className="w-4 h-4 text-green-400" />
                              : <TrendingDown className="w-4 h-4 text-red-400" />
                            }
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className={`text-base font-semibold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                                {isIncome ? '+' : ''}{fmtEuro(txn.amount)}
                              </span>
                              <span className="text-xs text-muted-foreground">{txn.booking_date}</span>
                              {txn.match_type && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                                  txn.match_type === 'iban'
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                }`}>
                                  {txn.match_type === 'iban' ? 'IBAN-Match' : 'Name-Match'}
                                </span>
                              )}
                              {txn.transaction_created && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30 font-medium">
                                  Kassenbuch
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">
                              {txn.counterparty || '—'}
                            </p>
                            {txn.purpose && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{txn.purpose}</p>
                            )}
                            {txn.iban && (
                              <p className="text-xs text-muted-foreground/60 font-mono mt-0.5">{txn.iban}</p>
                            )}
                            {txn.matched_member_name && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-primary">
                                <Users className="w-3 h-3" />
                                {txn.matched_member_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}

                  {displayedTxns.length === 0 && (
                    <div className="py-10 text-center text-muted-foreground text-sm">
                      Keine Buchungen in diesem Filter.
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-primary/5 border border-primary/15 rounded-xl">
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Automatischer Abgleich:</strong> Mitglieder werden anhand ihrer gespeicherten IBAN oder ihres Nachnamens im Verwendungszweck erkannt.
                      Hinterlege IBANs in der Mitgliederverwaltung für optimale Erkennungsrate.
                    </span>
                  </p>
                </div>
              </motion.div>
            )}
          </main>
        </div>
        </div>
      </MobileNavProvider>
    </AuthGuard>
  )
}
