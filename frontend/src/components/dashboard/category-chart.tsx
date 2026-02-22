'use client'

import { useEffect, useState } from 'react'
import { transactionsApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface CategoryData {
  name: string
  amount: number
  color: string
}

const COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#6b7280',
]

export function CategoryChart({ type }: { type: 'income' | 'expense' }) {
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    transactionsApi.list({ type, limit: 500 })
      .then((r) => {
        const transactions = r.data as Array<{ category: string | null; amount: string | number }>
        const map = new Map<string, number>()

        for (const t of transactions) {
          const name = t.category || 'Sonstiges'
          const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
          map.set(name, (map.get(name) || 0) + amount)
        }

        const sorted = Array.from(map.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, amount], i) => ({
            name,
            amount,
            color: COLORS[i % COLORS.length],
          }))

        setCategories(sorted)
      })
      .catch(() => setCategories([]))
      .finally(() => setIsLoading(false))
  }, [type])

  if (isLoading) {
    return <div className="h-32 rounded-xl bg-secondary/30 animate-pulse" />
  }

  if (categories.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
        Keine Daten vorhanden
      </div>
    )
  }

  const total = categories.reduce((s, c) => s + c.amount, 0)

  // Build pie chart
  const size = 100
  const cx = size / 2
  const cy = size / 2
  const r = 38
  const innerR = 22

  let angle = -Math.PI / 2
  const slices = categories.map((cat) => {
    const portion = cat.amount / total
    const startAngle = angle
    const endAngle = angle + portion * 2 * Math.PI
    angle = endAngle

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const ix1 = cx + innerR * Math.cos(startAngle)
    const iy1 = cy + innerR * Math.sin(startAngle)
    const ix2 = cx + innerR * Math.cos(endAngle)
    const iy2 = cy + innerR * Math.sin(endAngle)
    const largeArc = portion > 0.5 ? 1 : 0

    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ')

    return { ...cat, d, portion }
  })

  return (
    <div className="flex items-start gap-4">
      {/* Donut chart */}
      <svg width={size} height={size} className="flex-shrink-0">
        {slices.map((slice, i) => (
          <path key={i} d={slice.d} fill={slice.color} fillOpacity={0.85} />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {categories.map((cat, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />
            <span className="text-muted-foreground truncate flex-1">{cat.name}</span>
            <span className="text-foreground font-medium flex-shrink-0">
              {((cat.amount / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
        <div className="pt-1 border-t border-border mt-1">
          <span className="text-xs text-muted-foreground">Gesamt: </span>
          <span className="text-xs font-medium text-foreground">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
