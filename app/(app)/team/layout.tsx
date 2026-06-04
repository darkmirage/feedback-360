import { requireAdmin } from '@/actions/auth'

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()
  return <>{children}</>
}
