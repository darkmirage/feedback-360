'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/types/database'
import { cn } from '@/lib/utils'

type User = Database['public']['Tables']['users']['Row']

export function NavSidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'My Reviews' },
    ...(user.role === 'admin'
      ? [
          { href: '/dashboard/admin', label: 'Review Cycles' },
          { href: '/dashboard/admin/users', label: 'Team Roster' },
        ]
      : []),
  ]

  return (
    <aside className="flex w-56 flex-col border-r border-border/60 bg-sidebar px-3 py-4">
      <div className="mb-8 px-3">
        <h1 className="text-sm font-semibold tracking-tight">360 Feedback</h1>
      </div>

      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent',
              pathname === item.href && 'text-foreground bg-accent'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex items-center justify-between px-3">
        <p className="text-xs text-muted-foreground truncate max-w-[120px]">
          {user.full_name}
        </p>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </aside>
  )
}
