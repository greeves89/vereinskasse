'use client'

import { useEffect, useState } from 'react'
import { transactionsApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface MonthData {
  month: string
  year: number
  income: number
  expense: number
}

export function MonthlyChart() {
  const [data, setData] = useState<MonthData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    transactionsApi.monthlyChart(6)
      .then((r) => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (data.length === 0 || data.every((d) => d.income === 0 && d.expense === 0)) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Keine Daten vorhanden
      </div>
    )
  }

  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1)
  const chartH = 120
  const barW = 20
  const gap = 6
  const groupW = barW * 2 + gap
  const paddingX = 40
  const paddingY = 16
  const chartW = data.length * (groupW + 16) + paddingX

  const scale = (val: number) => chartH - (val / maxVal) * chartH

  // Y-axis labels (3 ticks)
  const ticks = [0, 0.5, 1].map((t) => ({
    val: maxVal * t,
    y: chartH - chartH * t + paddingY,
  }))

  return (
    <div className="overflow-x-auto">
      <svg
        width="100%"
        viewBox={`0 0 ${chartW} ${chartH + paddingY + 28}`}
        className="w-full"
        style={{ minWidth: `${chartW}px` }}
      >
        {/* Y-axis gridlines */}
        {ticks.map((tick) => (
          <g key={tick.val}>
            <line
              x1={paddingX}
              y1={tick.y}
              x2={chartW}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <text
              x={paddingX - 6}
              y={tick.y + 4}
              textAnchor="end"
              fontSize={9}
              fill="currentColor"
              fillOpacity={0.4}
            >
              {tick.val >= 1000 ? `${(tick.val / 1000).toFixed(0)}k` : tick.val.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const x = paddingX + i * (groupW + 16)
          const incomeH = (d.income / maxVal) * chartH
          const expenseH = (d.expense / maxVal) * chartH

          return (
            <g key={`${d.month}-${d.year}`}>
              {/* Income bar */}
              <rect
                x={x}
                y={scale(d.income) + paddingY}
                width={barW}
                height={incomeH}
                rx={3}
                fill="hsl(var(--success))"
                fillOpacity={0.85}
              />
              {/* Expense bar */}
              <rect
                x={x + barW + gap}
                y={scale(d.expense) + paddingY}
                width={barW}
                height={expenseH}
                rx={3}
                fill="hsl(var(--destructive))"
                fillOpacity={0.75}
              />
              {/* Month label */}
              <text
                x={x + groupW / 2}
                y={chartH + paddingY + 14}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.5}
              >
                {d.month}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-success opacity-85" />
          <span className="text-xs text-muted-foreground">Einnahmen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-destructive opacity-75" />
          <span className="text-xs text-muted-foreground">Ausgaben</span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          Letzte {data.length} Monate
        </div>
      </div>
    </div>
  )
}
