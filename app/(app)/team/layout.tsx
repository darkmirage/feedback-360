import { requireAdminOrManager } from '@/actions/auth'

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminOrManager()
  return <>{children}</>
}
