'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: string
    positive: boolean
  }
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'info'
  delay?: number
}

const colorMap = {
  primary: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    icon: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  success: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    icon: 'text-success',
    iconBg: 'bg-success/10',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    icon: 'text-warning',
    iconBg: 'bg-warning/10',
  },
  destructive: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    icon: 'text-destructive',
    iconBg: 'bg-destructive/10',
  },
  info: {
    bg: 'bg-info/10',
    border: 'border-info/20',
    icon: 'text-info',
    iconBg: 'bg-info/10',
  },
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'primary', delay = 0 }: StatsCardProps) {
  const colors = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'relative overflow-hidden rounded-xl border p-5 backdrop-blur-sm',
        'bg-card/80 border-border/60',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              trend.positive ? 'text-success' : 'text-destructive'
            )}>
              <span>{trend.positive ? '+' : ''}{trend.value}</span>
              <span className="text-muted-foreground font-normal">diesen Monat</span>
            </div>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colors.iconBg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
      </div>

      {/* Subtle gradient accent */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 h-0.5 opacity-60',
        color === 'primary' && 'bg-gradient-to-r from-transparent via-primary to-transparent',
        color === 'success' && 'bg-gradient-to-r from-transparent via-success to-transparent',
        color === 'warning' && 'bg-gradient-to-r from-transparent via-warning to-transparent',
        color === 'destructive' && 'bg-gradient-to-r from-transparent via-destructive to-transparent',
        color === 'info' && 'bg-gradient-to-r from-transparent via-info to-transparent',
      )} />
    </motion.div>
  )
}
