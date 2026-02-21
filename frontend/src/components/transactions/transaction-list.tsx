'use client'

import { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface TransactionListProps {
  transactions: Transaction[]
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
}

export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  return (
    <div className="divide-y divide-border">
      {transactions.map((t, i) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
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
              <p className="text-xs text-muted-foreground">
                {t.category && `${t.category} • `}{formatDate(t.transaction_date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${
              t.type === 'income' ? 'text-success' : 'text-destructive'
            }`}>
              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
