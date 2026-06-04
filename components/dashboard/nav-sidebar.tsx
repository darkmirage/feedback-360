'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Database } from '@/lib/types/database'
import { cn } from '@/lib/utils'

type User = Database['public']['Tables']['users']['Row']

export function NavSidebar({ user }: { user: User }) {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', label: 'My Reviews' },
    ...(user.role === 'admin'
      ? [{ href: '/dashboard/admin', label: 'Admin' }]
      : []),
  ]

  return (
    <aside className="flex w-64 flex-col border-r bg-muted/30 p-4">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">360 Feedback</h1>
        <p className="text-sm text-muted-foreground truncate">{user.full_name}</p>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
              pathname === item.href && 'bg-accent'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Separator className="my-4" />

      <div className="mt-auto">
        <form action={signOut}>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  )
}
