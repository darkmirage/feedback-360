import { requireAuth } from '@/actions/auth'
import { NavSidebar } from '@/components/dashboard/nav-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  return (
    <div className="flex min-h-screen">
      <NavSidebar user={user} />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
