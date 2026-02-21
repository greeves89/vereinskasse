'use client'

import { useRouter } from 'next/navigation'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuthStore } from '@/lib/auth'
import { getInitials } from '@/lib/utils'
import { Settings, LogOut, User, Shield } from 'lucide-react'

export function UserMenu() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center hover:bg-primary/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
          <span className="text-sm font-semibold text-primary">
            {user ? getInitials(user.name) : 'U'}
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[200px] rounded-xl border border-border bg-popover shadow-xl p-1.5 animate-slide-down"
          sideOffset={8}
          align="end"
        >
          <div className="px-3 py-2 mb-1 border-b border-border">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary cursor-pointer text-foreground outline-none"
            onSelect={() => router.push('/settings')}
          >
            <User className="w-4 h-4 text-muted-foreground" />
            Mein Profil
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary cursor-pointer text-foreground outline-none"
            onSelect={() => router.push('/settings')}
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            Einstellungen
          </DropdownMenu.Item>

          {user?.role === 'admin' && (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary cursor-pointer text-foreground outline-none"
              onSelect={() => router.push('/admin')}
            >
              <Shield className="w-4 h-4 text-muted-foreground" />
              Administration
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className="my-1 border-border" />

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 cursor-pointer text-destructive outline-none"
            onSelect={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
