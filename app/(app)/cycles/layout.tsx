import { requireAdminOrManager } from '@/actions/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminOrManager()
  return <>{children}</>
}
