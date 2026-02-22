'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Tag,
  MessageSquare,
  Settings,
  Shield,
  ClipboardList,
  TrendingUp,
  Crown,
  Bell,
  Calendar,
  CreditCard,
  Layers,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/members', icon: Users, label: 'Mitglieder' },
  { href: '/groups', icon: Layers, label: 'Gruppen' },
  { href: '/beitraege', icon: Bell, label: 'Beiträge' },
  { href: '/transactions', icon: BookOpen, label: 'Kassenbuch' },
  { href: '/categories', icon: Tag, label: 'Kategorien' },
  { href: '/events', icon: Calendar, label: 'Veranstaltungen' },
  { href: '/sepa', icon: CreditCard, label: 'SEPA-Lastschrift' },
  { href: '/feedback', icon: MessageSquare, label: 'Feedback' },
  { href: '/settings', icon: Settings, label: 'Einstellungen' },
]

const adminItems = [
  { href: '/admin', icon: Shield, label: 'Admin Übersicht' },
  { href: '/admin/users', icon: Users, label: 'Benutzerverwaltung' },
  { href: '/admin/feedback', icon: MessageSquare, label: 'Feedback verwalten' },
  { href: '/admin/audit-log', icon: ClipboardList, label: 'Audit-Log' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  return (
    <aside className="sidebar-width flex-shrink-0 h-screen flex flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-foreground text-lg">VereinsKasse</span>
        </Link>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-secondary/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">
              {user?.name?.slice(0, 2).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <div className="flex items-center gap-1">
              {user?.subscription_tier === 'premium' && (
                <Crown className="w-3 h-3 text-warning" />
              )}
              <p className="text-xs text-muted-foreground truncate">
                {user?.organization_name || user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <item.icon className={cn('w-4 h-4', isActive ? 'text-primary' : '')} />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </motion.div>
            </Link>
          )
        })}

        {user?.role === 'admin' && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-3">
                Administration
              </p>
            </div>
            {adminItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    )}
                  >
                    <item.icon className={cn('w-4 h-4', isActive ? 'text-primary' : '')} />
                    {item.label}
                  </motion.div>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Premium upgrade banner */}
      {user?.subscription_tier === 'free' && (
        <div className="px-4 pb-4">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-warning" />
              <span className="text-xs font-semibold text-foreground">Premium</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Unlimitierte Mitglieder, PDF-Export & mehr
            </p>
            <Link href="/settings">
              <div className="text-xs text-center py-1.5 px-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                0,99€/Monat upgraden
              </div>
            </Link>
          </div>
        </div>
      )}
    </aside>
  )
}
