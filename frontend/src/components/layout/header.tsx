'use client'

import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { UserMenu } from './user-menu'
import { useMobileNav } from './mobile-nav-context'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggle } = useMobileNav()

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          aria-label="Menü öffnen"
        >
          <Menu className="w-5 h-5" />
        </button>
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </motion.div>
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <UserMenu />
      </div>
    </header>
  )
}
