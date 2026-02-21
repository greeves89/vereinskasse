import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(num)
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy', { locale: de })
  } catch {
    return dateStr
  }
}

export function formatDateLong(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd. MMMM yyyy', { locale: de })
  } catch {
    return dateStr
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Aktiv',
    inactive: 'Inaktiv',
    suspended: 'Gesperrt',
    pending: 'Ausstehend',
    approved: 'Angenommen',
    rejected: 'Abgelehnt',
    in_review: 'In Bearbeitung',
    free: 'Kostenlos',
    premium: 'Premium',
    sent: 'Gesendet',
    paid: 'Bezahlt',
    overdue: 'Überfällig',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-success',
    inactive: 'text-muted-foreground',
    suspended: 'text-destructive',
    pending: 'text-warning',
    approved: 'text-success',
    rejected: 'text-destructive',
    in_review: 'text-info',
    premium: 'text-primary',
    sent: 'text-success',
    paid: 'text-success',
    overdue: 'text-destructive',
  }
  return colors[status] || 'text-foreground'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getFeedbackTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    bug: 'Fehler',
    feature: 'Feature-Wunsch',
    general: 'Allgemeines',
  }
  return labels[type] || type
}
