'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { useTransactions, useTransactionStats } from '@/hooks/use-transactions'
import { transactionsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'
import { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CsvImportDialog } from '@/components/csv-import-dialog'
import {
  BookOpen, Plus, ArrowUpRight, ArrowDownRight, Edit2, Trash2,
  Download, Filter, TrendingUp, TrendingDown, DollarSign, Upload,
} from 'lucide-react'

function TransactionsContent() {
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const { transactions, isLoading, refetch } = useTransactions({ type: typeFilter || undefined })
  const { stats } = useTransactionStats()

  const handleCreate = async (data: Record<string, unknown>) => {
    await transactionsApi.create(data)
    refetch()
  }

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (editTransaction) {
      await transactionsApi.update(editTransaction.id, data)
      refetch()
    }
  }

  const handleDelete = async (t: Transaction) => {
    if (confirm(`Buchung "${t.description}" wirklich löschen?`)) {
      await transactionsApi.delete(t.id)
      refetch()
    }
  }

  const handleImportTransactions = async (file: File) => {
    const res = await transactionsApi.importCsv(file)
    refetch()
    return res.data
  }

  const handleDownloadTransactionTemplate = async () => {
    const res = await transactionsApi.downloadTemplate()
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = 'buchungen_vorlage.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportDatev = async () => {
    try {
      const response = await transactionsApi.exportDatev()
      const url = URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'datev_export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export fehlgeschlagen. Premium-Abo erforderlich.')
    }
  }

  const handleExportPdf = async () => {
    try {
      const year = new Date().getFullYear()
      const response = await transactionsApi.exportJahresabschluss(year)
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `jahresabschluss_${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export fehlgeschlagen. Premium-Abo erforderlich.')
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Kassenbuch"
          subtitle="Einnahmen und Ausgaben verwalten"
          actions={
            <div className="flex items-center gap-2">
              {user?.subscription_tier === 'premium' && (
                <>
                  <button
                    onClick={handleExportDatev}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    DATEV
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                </>
              )}
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary text-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={() => { setEditTransaction(null); setShowForm(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Buchung anlegen
              </button>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card/80 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kassenstand</p>
                  <p className="text-base font-bold text-foreground">{formatCurrency(stats.balance)}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card/80 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Einnahmen (Monat)</p>
                  <p className="text-base font-bold text-success">{formatCurrency(stats.month_income)}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card/80 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ausgaben (Monat)</p>
                  <p className="text-base font-bold text-destructive">{formatCurrency(stats.month_expense)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-2">
              {[
                { value: '', label: 'Alle' },
                { value: 'income', label: 'Einnahmen' },
                { value: 'expense', label: 'Ausgaben' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    typeFilter === f.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions table */}
          <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
            {isLoading ? (
              <div className="divide-y divide-border">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-8 h-8 rounded-lg bg-secondary animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-secondary animate-pulse rounded w-48" />
                      <div className="h-3 bg-secondary animate-pulse rounded w-24" />
                    </div>
                    <div className="h-4 bg-secondary animate-pulse rounded w-20" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">Keine Buchungen</h3>
                <p className="text-sm text-muted-foreground mb-4">Legen Sie Ihre erste Buchung an</p>
                <button
                  onClick={() => { setEditTransaction(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Erste Buchung anlegen
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Header */}
                <div className="grid grid-cols-[32px_1fr_120px_120px_80px_80px] gap-4 px-5 py-3 text-xs font-medium text-muted-foreground">
                  <div />
                  <div>Beschreibung</div>
                  <div>Kategorie</div>
                  <div>Datum</div>
                  <div className="text-right">Betrag</div>
                  <div />
                </div>
                {transactions.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-[32px_1fr_120px_120px_80px_80px] gap-4 items-center px-5 py-3.5 hover:bg-secondary/30 transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      t.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'
                    }`}>
                      {t.type === 'income'
                        ? <ArrowUpRight className="w-4 h-4 text-success" />
                        : <ArrowDownRight className="w-4 h-4 text-destructive" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.description}</p>
                      {t.receipt_number && (
                        <p className="text-xs text-muted-foreground">Beleg: {t.receipt_number}</p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{t.category || '-'}</div>
                    <div className="text-sm text-muted-foreground">{formatDate(t.transaction_date)}</div>
                    <div className={`text-sm font-semibold text-right ${
                      t.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditTransaction(t); setShowForm(true) }}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {showForm && (
        <TransactionForm
          transaction={editTransaction}
          onSubmit={editTransaction ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditTransaction(null) }}
        />
      )}

      {showImport && (
        <CsvImportDialog
          title="Buchungen importieren"
          description="Importieren Sie Buchungen aus einer CSV-Datei. Laden Sie zuerst die Vorlage herunter, um das korrekte Format zu sehen."
          templateFilename="buchungen_vorlage.csv"
          onClose={() => { setShowImport(false); refetch() }}
          onImport={handleImportTransactions}
          onDownloadTemplate={handleDownloadTransactionTemplate}
        />
      )}
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <AuthGuard>
      <TransactionsContent />
    </AuthGuard>
  )
}
